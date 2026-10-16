import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, firstValueFrom } from 'rxjs';

import { EtatDesLieuxApi } from '../etat-des-lieux.api';
import { ElementDto, PhotoDto } from '../etat-des-lieux.model';
import {
  EcritureLocale,
  cleEcriture,
  delaiRetry,
} from './ecriture-locale';
import { EtatDesLieuxStockage } from './etat-des-lieux-stockage';
import { PhotoLocale } from './photo-locale';
import { ReseauService } from './reseau.service';
import { genererUuid } from './uuid';

/** Ce que la file annonce au reste de la page. */
export type ResultatSync =
  /** Le serveur a pris l'écriture : voici l'élément tel qu'il le détient. */
  | { type: 'ok'; element: ElementDto }
  /** Le serveur avait plus récent : la saisie locale est abandonnée, voici sa version. */
  | { type: 'conflit'; element: ElementDto }
  /** Le document est validé/signé entre-temps : plus aucune écriture possible. */
  | { type: 'verrouille' }
  /** Le serveur refuse cette saisie (400/404/422) : abandonnée. */
  | { type: 'refus'; elementId: string; message: string }
  /** Une photo est arrivée chez le serveur (donc sur OneDrive). */
  | { type: 'photo'; elementId: string; photo: PhotoDto }
  /** Une photo est bien supprimée côté serveur. */
  | { type: 'photo-supprimee'; photoId: string };

/** Le lien ne marche plus (expiré, révoqué) : les saisies restent sur l'appareil. */
export type CauseBlocage = 'LIEN_EXPIRE' | 'LIEN_INVALIDE';

type Issue = 'ok' | 'transitoire' | 'abandon' | 'bloque';

/** Plafond du délai demandé par `Retry-After` : au-delà, on reste sur le rythme normal. */
const RETRY_AFTER_MAX_MS = 120_000;

/**
 * File de synchronisation : rejoue vers l'API ce qui est gardé sur l'appareil —
 * les saisies d'éléments ET les photos, chacune avec son propre statut.
 *
 *   enregistrer() ─► 1. IndexedDB ─► 2. flush() ─► PATCH / POST / DELETE ─┬─ ok ─► retirée de la file
 *                                                                         └─ réseau/5xx/429 ─► reste, nouvel essai :
 *                       nouvelle saisie · événement « online » · minuteur 15 s → 30 s (ou Retry-After)
 *
 * Fournie par la PAGE (pas en `root`) : une file par document ouvert.
 */
@Injectable()
export class SyncQueueService {
  private readonly api = inject(EtatDesLieuxApi);
  private readonly stockage = inject(EtatDesLieuxStockage);
  private readonly reseau = inject(ReseauService);
  private readonly destroyRef = inject(DestroyRef);

  /** Saisies d'éléments en attente, par clé. */
  readonly enAttente = signal<ReadonlyMap<string, EcritureLocale>>(new Map());
  /** Photos gardées sur l'appareil (à envoyer, envoyées, ou à supprimer), par id. */
  readonly photos = signal<ReadonlyMap<string, PhotoLocale>>(new Map());
  /** Photos qui n'ont pas encore été confirmées (envoi ou suppression à faire). */
  readonly photosEnAttente = computed(
    () => [...this.photos().values()].filter((p) => p.statut !== 'envoyee').length,
  );
  readonly envoiEnCours = signal(false);
  readonly bloque = signal<CauseBlocage | null>(null);
  /** Pourquoi les photos n'avancent pas (ex. OneDrive non connecté), à montrer au locataire. */
  readonly raisonAttentePhotos = signal<string | null>(null);
  readonly resultats$ = new Subject<ResultatSync>();

  private token = '';
  private docId = '';
  private demarree = false;
  private enVol = false;
  private relancer = false;
  /** Échecs consécutifs : 0 après un succès. Le 1er réessai part après 15 s. */
  private echecs = 0;
  /** Délai minimal imposé par un `Retry-After`, appliqué au prochain minuteur. */
  private delaiMiniMs = 0;
  private photoEnVol: string | null = null;
  private minuteur: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reseau.retourEnLigne$
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.flush());
    this.destroyRef.onDestroy(() => this.annulerMinuteur());
  }

  /** Branche la file sur un document, avec ce que l'appareil avait déjà en attente. */
  demarrer(
    token: string,
    docId: string,
    existantes: EcritureLocale[],
    photos: PhotoLocale[] = [],
  ): void {
    this.token = token;
    this.docId = docId;
    this.demarree = true;
    this.enAttente.set(new Map(existantes.map((e) => [e.cle, e])));
    this.photos.set(new Map(photos.map((p) => [p.id, p])));
  }

  /**
   * Prend une saisie : l'écrit d'ABORD sur l'appareil, puis tente l'envoi.
   * L'écran voit la saisie dès la mise à jour du signal (avant même l'écriture
   * disque) ; la promesse se résout quand elle est durablement stockée.
   */
  async enregistrer(
    elementId: string,
    champs: EcritureLocale['champs'],
    modifieLe: string,
  ): Promise<void> {
    const cle = cleEcriture(this.docId, elementId);
    const precedente = this.enAttente().get(cle);
    const ecriture: EcritureLocale = {
      cle,
      docId: this.docId,
      elementId,
      champs: { ...precedente?.champs, ...champs },
      modifieLe,
      seq: (precedente?.seq ?? 0) + 1,
    };

    this.poser(ecriture);
    await this.stockage.sauverEcriture(ecriture);
    // Une saisie neuve passe tout de suite, sans attendre le minuteur de secours.
    void this.flush();
  }

  /** Garde une photo (déjà compressée) sur l'appareil, puis tente de l'envoyer. */
  async ajouterPhoto(elementId: string, fichier: Blob): Promise<string> {
    const photo: PhotoLocale = {
      id: genererUuid(),
      docId: this.docId,
      elementId,
      blob: fichier,
      statut: 'attente',
      creeLe: new Date().toISOString(),
    };

    this.poserPhoto(photo);
    await this.stockage.sauverPhoto(photo);
    void this.flush();
    return photo.id;
  }

  /**
   * Retire une photo. Jamais partie : on l'efface simplement. Déjà chez le
   * serveur (ou en cours d'envoi) : on garde une « pierre tombale » que la file
   * transformera en DELETE — y compris hors ligne.
   */
  async supprimerPhoto(photoId: string, elementId: string): Promise<void> {
    const photo = this.photos().get(photoId);

    if (photo?.statut === 'attente' && this.photoEnVol !== photoId) {
      this.retirerPhoto(photoId);
      await this.stockage.supprimerPhoto(photoId);
      return;
    }

    const tombe: PhotoLocale = {
      id: photoId,
      docId: this.docId,
      elementId: photo?.elementId ?? elementId,
      blob: null,
      statut: 'suppression',
      creeLe: new Date().toISOString(),
    };
    this.poserPhoto(tombe);
    await this.stockage.sauverPhoto(tombe);
    void this.flush();
  }

  /** Retire des saisies devenues périmées (le serveur avait plus récent). */
  async abandonner(ecritures: EcritureLocale[]): Promise<void> {
    this.retirer(ecritures.map((e) => e.cle));
    await Promise.all(
      ecritures.map((e) => this.stockage.supprimerEcriture(e.cle, e.seq)),
    );
  }

  /** Document signé : plus rien à envoyer, et rien à garder sur l'appareil. */
  async purger(): Promise<void> {
    this.annulerMinuteur();
    this.enAttente.set(new Map());
    this.photos.set(new Map());
    await this.stockage.purgerDocument(this.docId);
  }

  /** Rejoue la file. Un seul envoi à la fois ; une demande pendant un envoi le relance. */
  async flush(): Promise<void> {
    if (!this.demarree || this.bloque() !== null) {
      return;
    }
    if (this.enVol) {
      this.relancer = true;
      return;
    }

    this.enVol = true;
    this.annulerMinuteur();
    this.envoiEnCours.set(true);

    try {
      do {
        this.relancer = false;
        const issue = await this.passer();
        if (issue === 'bloque') {
          return;
        }
        this.echecs = issue === 'transitoire' ? this.echecs + 1 : 0;
      } while (this.relancer);
    } finally {
      this.enVol = false;
      this.envoiEnCours.set(false);
      this.planifier();
    }
  }

  // ----------------------------------------------------------------- interne

  /** Une passe sur la file : les saisies d'abord, puis les photos. S'arrête au premier échec. */
  private async passer(): Promise<Issue> {
    const saisies = [...this.enAttente().values()].sort((a, b) =>
      a.modifieLe.localeCompare(b.modifieLe),
    );
    for (const ecriture of saisies) {
      const issue = await this.envoyer(ecriture);
      if (issue === 'transitoire' || issue === 'bloque') {
        return issue;
      }
    }

    const photos = [...this.photos().values()]
      .filter((p) => p.statut !== 'envoyee')
      .sort((a, b) => a.creeLe.localeCompare(b.creeLe));
    for (const photo of photos) {
      const issue = await this.traiterPhoto(photo);
      if (issue === 'transitoire' || issue === 'bloque') {
        return issue;
      }
    }

    return 'ok';
  }

  private async envoyer(ecriture: EcritureLocale): Promise<Issue> {
    try {
      const element = await firstValueFrom(
        this.api.modifierElement(this.token, ecriture.elementId, {
          ...ecriture.champs,
          modifieLe: ecriture.modifieLe,
        }),
      );
      await this.terminer(ecriture);
      this.resultats$.next({ type: 'ok', element });
      return 'ok';
    } catch (erreur) {
      return this.traiterEchec(ecriture, erreur);
    }
  }

  private async traiterEchec(
    ecriture: EcritureLocale,
    erreur: unknown,
  ): Promise<Issue> {
    if (!(erreur instanceof HttpErrorResponse) || estTransitoire(erreur)) {
      this.noterRetryAfter(erreur);
      return 'transitoire';
    }

    const code = (erreur.error as { code?: string } | null)?.code;

    if (erreur.status === 401) {
      // Lien expiré ou révoqué : les saisies restent stockées. Avec le
      // nouveau lien du bailleur (même document, donc même clé locale), la
      // page les retrouvera et les enverra.
      this.bloque.set(code === 'LIEN_EXPIRE' ? 'LIEN_EXPIRE' : 'LIEN_INVALIDE');
      return 'bloque';
    }

    await this.terminer(ecriture);

    if (erreur.status === 409 && code === 'VERSION_PLUS_RECENTE') {
      const element = (erreur.error as { element?: ElementDto }).element;
      if (element) {
        this.resultats$.next({ type: 'conflit', element });
        return 'abandon';
      }
    }
    if (erreur.status === 409) {
      // DEJA_SIGNE ou NON_MODIFIABLE : tout le document est figé.
      this.resultats$.next({ type: 'verrouille' });
      return 'abandon';
    }

    this.resultats$.next({
      type: 'refus',
      elementId: ecriture.elementId,
      message: messageServeur(erreur, 'Saisie refusée par le serveur.'),
    });
    return 'abandon';
  }

  // ------------------------------------------------------------------ photos

  private async traiterPhoto(photo: PhotoLocale): Promise<Issue> {
    try {
      if (photo.statut === 'suppression') {
        await firstValueFrom(this.api.supprimerPhoto(this.token, photo.id));
        await this.effacerPhoto(photo.id);
        this.resultats$.next({ type: 'photo-supprimee', photoId: photo.id });
        return 'ok';
      }

      if (photo.blob === null) {
        // Ne devrait pas arriver (photo à envoyer sans fichier) : on la jette.
        await this.effacerPhoto(photo.id);
        return 'abandon';
      }

      this.photoEnVol = photo.id;
      const envoyee = await firstValueFrom(
        this.api.envoyerPhoto(this.token, photo.elementId, photo.id, photo.blob),
      );

      // Si le locataire l'a supprimée PENDANT l'envoi, la pierre tombale a pris
      // la place : on la laisse, le DELETE suivra.
      const actuelle = this.photos().get(photo.id);
      if (actuelle?.statut === 'attente') {
        const confirmee: PhotoLocale = { ...actuelle, statut: 'envoyee' };
        this.poserPhoto(confirmee);
        await this.stockage.sauverPhoto(confirmee);
      }
      this.raisonAttentePhotos.set(null);
      this.resultats$.next({ type: 'photo', elementId: photo.elementId, photo: envoyee });
      return 'ok';
    } catch (erreur) {
      return this.traiterEchecPhoto(photo, erreur);
    } finally {
      this.photoEnVol = null;
    }
  }

  private async traiterEchecPhoto(
    photo: PhotoLocale,
    erreur: unknown,
  ): Promise<Issue> {
    if (!(erreur instanceof HttpErrorResponse) || estTransitoire(erreur)) {
      this.noterRetryAfter(erreur);
      const code = (erreur as HttpErrorResponse | null)?.error?.code;
      if (typeof code === 'string' && code.startsWith('ONEDRIVE_')) {
        this.raisonAttentePhotos.set(
          'Les photos seront envoyées dès que le stockage sera de nouveau disponible.',
        );
      }
      return 'transitoire';
    }

    const code = (erreur.error as { code?: string } | null)?.code;

    if (erreur.status === 401) {
      this.bloque.set(code === 'LIEN_EXPIRE' ? 'LIEN_EXPIRE' : 'LIEN_INVALIDE');
      return 'bloque';
    }

    // Une suppression d'une photo déjà absente est un succès.
    if (photo.statut === 'suppression' && erreur.status === 404) {
      await this.effacerPhoto(photo.id);
      this.resultats$.next({ type: 'photo-supprimee', photoId: photo.id });
      return 'ok';
    }

    await this.effacerPhoto(photo.id);

    if (erreur.status === 409) {
      this.resultats$.next({ type: 'verrouille' });
      return 'abandon';
    }

    this.resultats$.next({
      type: 'refus',
      elementId: photo.elementId,
      message:
        code === 'TROP_DE_PHOTOS'
          ? '5 photos au maximum par élément : la dernière n’a pas été conservée.'
          : messageServeur(erreur, 'Photo refusée par le serveur.'),
    });
    return 'abandon';
  }

  private async effacerPhoto(id: string): Promise<void> {
    this.retirerPhoto(id);
    await this.stockage.supprimerPhoto(id);
  }

  // ---------------------------------------------------------------- commun

  /** L'écriture est réglée (envoyée ou abandonnée) : on la retire, sauf saisie plus récente. */
  private async terminer(ecriture: EcritureLocale): Promise<void> {
    const actuelle = this.enAttente().get(ecriture.cle);
    if (actuelle?.seq === ecriture.seq) {
      this.retirer([ecriture.cle]);
    }
    await this.stockage.supprimerEcriture(ecriture.cle, ecriture.seq);
  }

  /** Respecte le `Retry-After` de Microsoft/du serveur (429, 503), dans la limite du raisonnable. */
  private noterRetryAfter(erreur: unknown): void {
    if (!(erreur instanceof HttpErrorResponse)) {
      return;
    }
    const secondes = Number(erreur.headers?.get('Retry-After'));
    if (Number.isFinite(secondes) && secondes > 0) {
      this.delaiMiniMs = Math.min(secondes * 1000, RETRY_AFTER_MAX_MS);
    }
  }

  private planifier(): void {
    if (
      this.minuteur !== null ||
      !this.demarree ||
      this.bloque() !== null ||
      (this.enAttente().size === 0 && this.photosEnAttente() === 0)
    ) {
      return;
    }

    const delai = Math.max(delaiRetry(this.echecs - 1), this.delaiMiniMs);
    this.delaiMiniMs = 0;
    this.minuteur = setTimeout(() => {
      this.minuteur = null;
      void this.flush();
    }, delai);
  }

  private annulerMinuteur(): void {
    if (this.minuteur !== null) {
      clearTimeout(this.minuteur);
      this.minuteur = null;
    }
  }

  private poser(ecriture: EcritureLocale): void {
    this.enAttente.update((anciennes) =>
      new Map(anciennes).set(ecriture.cle, ecriture),
    );
  }

  private retirer(cles: string[]): void {
    this.enAttente.update((anciennes) => {
      const copie = new Map(anciennes);
      cles.forEach((cle) => copie.delete(cle));
      return copie;
    });
  }

  private poserPhoto(photo: PhotoLocale): void {
    this.photos.update((anciennes) => new Map(anciennes).set(photo.id, photo));
  }

  private retirerPhoto(id: string): void {
    this.photos.update((anciennes) => {
      const copie = new Map(anciennes);
      copie.delete(id);
      return copie;
    });
  }
}

/** Réseau coupé, serveur qui dort ou surchargé : ça se rejoue, sans rien perdre. */
const estTransitoire = (erreur: HttpErrorResponse): boolean =>
  erreur.status === 0 ||
  erreur.status === 408 ||
  erreur.status === 425 ||
  erreur.status === 429 ||
  erreur.status >= 500;

const messageServeur = (erreur: HttpErrorResponse, defaut: string): string => {
  const detail = (erreur.error as { message?: unknown } | null)?.message;
  return typeof detail === 'string' ? detail : defaut;
};
