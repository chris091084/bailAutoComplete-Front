import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { EtatDesLieuxApi } from './etat-des-lieux.api';
import {
  CodeErreurEdl,
  ElementDto,
  ElementManquant,
  EtatDesLieuxDto,
  PhotoDto,
  PieceDto,
  SuitesSignature,
} from './etat-des-lieux.model';
import {
  EcritureLocale,
  appliquerEcritures,
  delaiRetry,
  docIdDepuisToken,
  reconcilier,
} from './hors-ligne/ecriture-locale';
import { EtatDesLieuxStockage } from './hors-ligne/etat-des-lieux-stockage';
import {
  PHOTOS_MAX_PAR_ELEMENT,
  PhotoLocale,
  VuePhoto,
} from './hors-ligne/photo-locale';
import { ReseauService } from './hors-ligne/reseau.service';
import { ResultatSync, SyncQueueService } from './hors-ligne/sync-queue.service';

/** Ce que l'écran affiche quand le document ne peut pas être chargé. */
export interface ErreurChargement {
  message: string;
  code: CodeErreurEdl | null;
}

/** Résultat d'une saisie : `ok` = prise en compte (au moins sur l'appareil). */
export interface ResultatEcriture {
  ok: boolean;
  message?: string;
}

/** Résultat de « Tout valider et signer ». */
export interface ResultatSignatureStore {
  ok: boolean;
  message?: string;
  /** Éléments que le serveur juge non traités (la page les signale). */
  manquants?: ElementManquant[];
}

/** Indicateur d'une ligne : à l'envoi (⟳ orange) ou confirmée par le serveur (✓ vert). */
export type EtatSyncElement = 'attente' | 'synchronise';

/** Essais rapprochés tant que le serveur, endormi, se réveille (3 s d'écart). */
const ESSAIS_REVEIL = 20;
const DELAI_REVEIL_MS = 3_000;

const estTransitoire = (erreur: unknown): boolean =>
  erreur instanceof HttpErrorResponse &&
  (erreur.status === 0 || [502, 503, 504].includes(erreur.status));

const codeErreur = (erreur: unknown): CodeErreurEdl | null =>
  erreur instanceof HttpErrorResponse
    ? ((erreur.error?.code as CodeErreurEdl | undefined) ?? null)
    : null;

const attendre = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * État de la page d'un état des lieux. Fourni par la PAGE (pas en `root`) : il
 * vit et meurt avec elle, un autre lien repart d'un état vierge.
 *
 * Ce que l'écran voit se compose de deux couches :
 *
 *   `base`       dernière version CONNUE du serveur (ou restaurée de l'appareil)
 *   + `enAttente` saisies du locataire pas encore confirmées (file de synchro)
 *   = `document`  ce qui s'affiche
 *
 * Les composants lisent `document` et appellent `validerRapidement` /
 * `confirmerModification` ; ils ne connaissent ni HTTP ni stockage local.
 */
@Injectable()
export class EtatDesLieuxStore {
  private readonly api = inject(EtatDesLieuxApi);
  private readonly stockage = inject(EtatDesLieuxStockage);
  private readonly reseau = inject(ReseauService);
  private readonly destroyRef = inject(DestroyRef);
  readonly file = inject(SyncQueueService);

  private token = '';
  private docId = '';
  private detruit = false;
  /** Adresses `blob:` des photos locales, créées une fois et libérées avec la page. */
  private readonly urlsLocales = new Map<string, string>();

  private readonly base = signal<EtatDesLieuxDto | null>(null);

  readonly chargement = signal<'chargement' | 'pret' | 'erreur'>('chargement');
  readonly erreur = signal<ErreurChargement | null>(null);
  /** Vrai tant que le serveur, endormi, met du temps à répondre. */
  readonly serveurEnReveil = signal(false);
  /**
   * `local` = affiché depuis l'appareil, le serveur ne l'a pas encore confirmé
   * (hors ligne, ou réveil en cours). Passe à `serveur` dès qu'il a répondu.
   */
  readonly source = signal<'serveur' | 'local' | null>(null);
  /**
   * Ce qui a suivi la signature (PDF, e-mails), connu seulement dans la session
   * où l'on a signé : rouvert plus tard, le document dit seulement « signé ».
   */
  readonly suitesSignature = signal<SuitesSignature | null>(null);
  readonly signatureEnCours = signal(false);
  /** Message à montrer au locataire (conflit, document verrouillé…), fermable. */
  readonly avis = signal<string | null>(null);

  readonly document = computed(() =>
    appliquerEcritures(this.base(), this.file.enAttente()),
  );
  readonly pieces = computed<PieceDto[]>(() => this.document()?.pieces ?? []);
  readonly elements = computed<ElementDto[]>(() =>
    this.pieces().flatMap((piece) => piece.elements),
  );
  /** Éléments que le locataire n'a pas encore traités (ni coche ni modification). */
  readonly restants = computed(
    () =>
      this.elements().filter((e) => e.statutValidation !== 'valide').length,
  );
  /**
   * Saisies ET photos pas encore confirmées par le serveur. Bloque la
   * signature : on ne signe pas un document dont une partie n'est que sur le
   * téléphone.
   */
  readonly nonSynchronises = computed(
    () => this.file.enAttente().size + this.file.photosEnAttente(),
  );

  /** Photos à afficher, par élément : celles du serveur + celles encore sur l'appareil. */
  readonly photosParElement = computed(() => this.construireVuesPhotos());
  /** Seul `draft` laisse modifier : `validated` et `signed` verrouillent les éléments. */
  readonly modifiable = computed(() => this.document()?.statut === 'draft');
  readonly horsLigne = computed(() => !this.reseau.enLigne());
  readonly stockagePersistant = this.stockage.persistant;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.detruit = true;
      this.urlsLocales.forEach((url) => URL.revokeObjectURL(url));
      this.urlsLocales.clear();
    });

    this.file.resultats$
      .pipe(takeUntilDestroyed())
      .subscribe((resultat) => void this.surResultat(resultat));

    // Au retour du réseau : la file se rejoue d'elle-même, et si on affichait
    // encore la copie locale, on va chercher la version du serveur.
    this.reseau.retourEnLigne$
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.rafraichirSiLocal());
  }

  async charger(token: string): Promise<void> {
    this.token = token;
    this.docId = docIdDepuisToken(token) ?? '';
    this.chargement.set('chargement');
    this.erreur.set(null);

    // 1. Ce que l'appareil a gardé : restauré sans rien demander au locataire.
    const [local, ecritures, photos] = this.docId
      ? await Promise.all([
          this.stockage.lireDocument(this.docId).catch(() => undefined),
          this.stockage.listerEcritures(this.docId).catch(() => []),
          this.stockage.listerPhotos(this.docId).catch(() => []),
        ])
      : [undefined, [] as EcritureLocale[], [] as PhotoLocale[]];

    this.file.demarrer(token, this.docId, ecritures, photos);

    if (local) {
      this.base.set(local.snapshot);
      this.source.set('local');
      this.chargement.set('pret');
    }

    // 2. Le serveur : sa version est fusionnée selon l'horodatage le plus récent.
    const confirme = await this.recupererServeur(local !== undefined);
    if (!confirme && !local) {
      this.chargement.set('erreur');
      return;
    }
    if (!confirme) {
      // Copie locale affichée, serveur injoignable : nouvel essai plus tard.
      void this.rafraichirEnBoucle();
    }

    void this.file.flush();
  }

  /**
   * Coche verte : accepte l'état du bailleur tel quel. N'écrit pas d'état du
   * locataire, seulement le statut « validé ».
   */
  validerRapidement(elementId: string): Promise<ResultatEcriture> {
    return this.ecrire(elementId, { statutValidation: 'valide' });
  }

  /** « Confirmer la modification » : saisie du locataire, et élément traité. */
  confirmerModification(
    elementId: string,
    etat: ElementDto['etatLocataire'],
    commentaire: string,
  ): Promise<ResultatEcriture> {
    return this.ecrire(elementId, {
      etatLocataire: etat,
      commentaireLocataire:
        commentaire.trim() === '' ? null : commentaire.trim(),
      statutValidation: 'valide',
    });
  }

  /**
   * « Tout valider et signer » : validation globale, puis signature. Le locataire
   * n'a rien à ressaisir si ça échoue (réseau coupé…) : la signature reste dans
   * la page, il réessaie.
   *
   * Cas délicat : la coupure survient APRÈS que le serveur a signé. Le nouvel
   * essai reçoit alors « déjà signé » — on recharge simplement le document, qui
   * est bel et bien signé.
   */
  async validerEtSigner(signature: string): Promise<ResultatSignatureStore> {
    if (this.nonSynchronises() > 0 || this.source() !== 'serveur') {
      return {
        ok: false,
        message: 'Des saisies ne sont pas encore envoyées : attendez la fin de la synchronisation.',
      };
    }

    this.signatureEnCours.set(true);
    try {
      await firstValueFrom(this.api.valider(this.token));
      const suites = await firstValueFrom(this.api.signer(this.token, signature));
      this.suitesSignature.set(suites);
      await this.recupererServeur(true);
      return { ok: true };
    } catch (erreur) {
      return await this.echecSignature(erreur);
    } finally {
      this.signatureEnCours.set(false);
    }
  }

  private async echecSignature(erreur: unknown): Promise<ResultatSignatureStore> {
    const code = codeErreur(erreur);

    if (code === 'DEJA_SIGNE') {
      await this.recupererServeur(true);
      return { ok: this.document()?.statut === 'signed' };
    }

    if (code === 'ELEMENTS_MANQUANTS' && erreur instanceof HttpErrorResponse) {
      // Le serveur n'est pas d'accord avec l'écran (autre appareil, saisie perdue) : on se recale.
      await this.recupererServeur(true);
      const manquants = (erreur.error?.manquants as ElementManquant[] | undefined) ?? [];
      return {
        ok: false,
        manquants,
        message: `${manquants.length} élément(s) restent à traiter : ils sont signalés dans la liste.`,
      };
    }

    if (code === 'SIGNATURE_INVALIDE') {
      return { ok: false, message: 'La signature n’a pas été acceptée. Effacez-la et recommencez.' };
    }
    if (code === 'LIEN_EXPIRE' || code === 'LIEN_INVALIDE') {
      return { ok: false, message: 'Ce lien n’est plus valable. Demandez-en un nouveau au bailleur.' };
    }
    if (code === 'NON_MODIFIABLE') {
      return { ok: false, message: 'Ce document est dans un état qui ne permet pas de signer. Contactez le bailleur.' };
    }
    if (estTransitoire(erreur) || (erreur instanceof HttpErrorResponse && erreur.status === 429)) {
      return {
        ok: false,
        message: 'Connexion perdue : la signature n’a pas pu être envoyée. Votre saisie est conservée, réessayez.',
      };
    }

    return { ok: false, message: 'La signature a échoué. Réessayez.' };
  }

  etatSync(elementId: string): EtatSyncElement {
    for (const ecriture of this.file.enAttente().values()) {
      if (ecriture.elementId === elementId) {
        return 'attente';
      }
    }
    for (const photo of this.file.photos().values()) {
      if (photo.elementId === elementId && photo.statut !== 'envoyee') {
        return 'attente';
      }
    }
    return 'synchronise';
  }

  /**
   * Ajoute une photo (déjà compressée) à un élément : gardée sur l'appareil
   * d'abord, envoyée ensuite. Refuse au-delà de 5 par élément.
   */
  async ajouterPhoto(elementId: string, fichier: Blob): Promise<ResultatEcriture> {
    if (!this.modifiable()) {
      return { ok: false, message: 'Ce document n’est plus modifiable.' };
    }
    if ((this.photosParElement().get(elementId)?.length ?? 0) >= PHOTOS_MAX_PAR_ELEMENT) {
      return {
        ok: false,
        message: `${PHOTOS_MAX_PAR_ELEMENT} photos au maximum par élément.`,
      };
    }

    await this.file.ajouterPhoto(elementId, fichier);
    return { ok: true };
  }

  async supprimerPhoto(elementId: string, photoId: string): Promise<void> {
    if (this.modifiable()) {
      await this.file.supprimerPhoto(photoId, elementId);
    }
  }

  fermerAvis(): void {
    this.avis.set(null);
  }

  /** Bouton « Réessayer maintenant » du bandeau. */
  reessayerMaintenant(): void {
    void this.file.flush();
    void this.rafraichirSiLocal();
  }

  // ----------------------------------------------------------------- interne

  private async ecrire(
    elementId: string,
    champs: EcritureLocale['champs'],
  ): Promise<ResultatEcriture> {
    if (!this.modifiable()) {
      return {
        ok: false,
        message: 'Ce document n’est plus modifiable.',
      };
    }
    if (!this.elements().some((e) => e.id === elementId)) {
      return { ok: false, message: 'Élément introuvable.' };
    }

    // Local d'abord : jamais bloqué par le réseau.
    await this.file.enregistrer(elementId, champs, new Date().toISOString());
    return { ok: true };
  }

  /**
   * Va chercher la version du serveur. Renvoie `true` si elle a été fusionnée.
   * Les échecs « serveur injoignable » se réessaient (réveil du conteneur) :
   * on n'abandonne qu'après `ESSAIS_REVEIL` essais, sauf si l'appareil a déjà
   * une copie à montrer — dans ce cas un seul essai suffit, la page est déjà là.
   */
  private async recupererServeur(copieLocaleAffichee: boolean): Promise<boolean> {
    const essais = copieLocaleAffichee ? 1 : ESSAIS_REVEIL;

    try {
      for (let essai = 1; ; essai++) {
        try {
          const serveur = await firstValueFrom(this.api.lire(this.token));
          await this.fusionner(serveur);
          return true;
        } catch (erreur) {
          if (!estTransitoire(erreur) || essai >= essais) {
            throw erreur;
          }
          this.serveurEnReveil.set(true);
          await attendre(DELAI_REVEIL_MS);
          if (this.detruit) {
            return false;
          }
        }
      }
    } catch (erreur) {
      if (!copieLocaleAffichee) {
        this.erreur.set(this.versErreurChargement(erreur));
      } else if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
        // Copie locale affichée, mais le lien n'est plus valable : les saisies
        // restent sur l'appareil, et le bandeau l'explique.
        this.file.bloque.set(
          codeErreur(erreur) === 'LIEN_EXPIRE' ? 'LIEN_EXPIRE' : 'LIEN_INVALIDE',
        );
      }
      return false;
    } finally {
      this.serveurEnReveil.set(false);
    }
  }

  /** Pose la version du serveur et trie les saisies locales face à elle. */
  private async fusionner(serveur: EtatDesLieuxDto): Promise<void> {
    const { abandonnees } = reconcilier(serveur, [
      ...this.file.enAttente().values(),
    ]);

    this.base.set(serveur);
    this.source.set('serveur');
    this.chargement.set('pret');
    this.erreur.set(null);

    if (abandonnees.length > 0) {
      await this.file.abandonner(abandonnees);
      this.avis.set(
        'Certains éléments ont été modifiés plus récemment depuis un autre appareil : la version à jour est affichée.',
      );
    }

    if (serveur.statut === 'signed') {
      // Document signé : le serveur a tout, l'appareil n'a plus de raison de
      // garder des photos ni des saisies (minimisation des données).
      await this.file.purger();
      return;
    }

    await this.memoriser();
  }

  /** Copie la version courante du serveur sur l'appareil (pour rouvrir hors ligne). */
  private async memoriser(): Promise<void> {
    const snapshot = this.base();
    if (snapshot === null || !this.docId) {
      return;
    }
    await this.stockage
      .sauverDocument({
        docId: this.docId,
        snapshot,
        enregistreLe: new Date().toISOString(),
      })
      .catch(() => undefined);
  }

  private async surResultat(resultat: ResultatSync): Promise<void> {
    switch (resultat.type) {
      case 'ok':
        this.remplacerDansBase(resultat.element);
        await this.memoriser();
        break;
      case 'conflit':
        this.remplacerDansBase(resultat.element);
        await this.memoriser();
        this.avis.set(
          'Cet élément a été modifié plus récemment ailleurs : la version à jour est affichée.',
        );
        break;
      case 'verrouille':
        // Le document est figé : tout ce qui attendait encore est périmé.
        await this.file.abandonner([...this.file.enAttente().values()]);
        this.avis.set('Ce document a été validé ou signé : il n’est plus modifiable.');
        await this.recupererServeur(true);
        break;
      case 'refus':
        this.avis.set(resultat.message);
        break;
      case 'photo':
        this.ajouterPhotoDansBase(resultat.elementId, resultat.photo);
        await this.memoriser();
        break;
      case 'photo-supprimee':
        this.retirerPhotoDeBase(resultat.photoId);
        await this.memoriser();
        break;
    }
  }

  private ajouterPhotoDansBase(elementId: string, photo: PhotoDto): void {
    this.modifierElementsDeBase((element) =>
      element.id === elementId && !element.photos.some((p) => p.id === photo.id)
        ? { ...element, photos: [...element.photos, photo] }
        : element,
    );
  }

  private retirerPhotoDeBase(photoId: string): void {
    this.modifierElementsDeBase((element) =>
      element.photos.some((p) => p.id === photoId)
        ? { ...element, photos: element.photos.filter((p) => p.id !== photoId) }
        : element,
    );
  }

  private modifierElementsDeBase(
    transformer: (element: ElementDto) => ElementDto,
  ): void {
    this.base.update((document) =>
      document === null
        ? document
        : {
            ...document,
            pieces: document.pieces.map((piece) => ({
              ...piece,
              elements: piece.elements.map(transformer),
            })),
          },
    );
  }

  /** Vignettes de chaque élément : photos du serveur, puis celles encore sur l'appareil. */
  private construireVuesPhotos(): Map<string, VuePhoto[]> {
    const locales = this.file.photos();
    const supprimees = new Set(
      [...locales.values()].filter((p) => p.statut === 'suppression').map((p) => p.id),
    );
    const vues = new Map<string, VuePhoto[]>();
    const connues = new Set<string>();

    for (const element of this.elements()) {
      const liste: VuePhoto[] = [];
      for (const photo of element.photos) {
        if (supprimees.has(photo.id)) {
          continue;
        }
        connues.add(photo.id);
        liste.push({
          id: photo.id,
          // Le Blob local, s'il y est, évite un aller-retour réseau.
          src: this.urlLocale(locales.get(photo.id)) ?? this.api.urlPhoto(this.token, photo.id),
          statut: 'synchronise',
        });
      }
      vues.set(element.id, liste);
    }

    for (const photo of locales.values()) {
      const src = this.urlLocale(photo);
      if (photo.statut === 'suppression' || connues.has(photo.id) || src === null) {
        continue;
      }
      vues.get(photo.elementId)?.push({
        id: photo.id,
        src,
        statut: photo.statut === 'attente' ? 'attente' : 'synchronise',
      });
    }

    return vues;
  }

  private urlLocale(photo: PhotoLocale | undefined): string | null {
    if (!photo?.blob) {
      return null;
    }
    let url = this.urlsLocales.get(photo.id);
    if (url === undefined) {
      url = URL.createObjectURL(photo.blob);
      this.urlsLocales.set(photo.id, url);
    }
    return url;
  }

  private remplacerDansBase(element: ElementDto): void {
    this.base.update((document) =>
      document === null
        ? document
        : {
            ...document,
            pieces: document.pieces.map((piece) => ({
              ...piece,
              elements: piece.elements.map((e) =>
                e.id === element.id ? element : e,
              ),
            })),
          },
    );
  }

  private async rafraichirSiLocal(): Promise<void> {
    if (this.source() === 'local' && this.token !== '') {
      await this.recupererServeur(true);
    }
  }

  /** Tant que la copie locale n'est pas confirmée, réessaie à 15 → 30 s. */
  private async rafraichirEnBoucle(): Promise<void> {
    for (let echecs = 0; this.source() === 'local' && !this.detruit; echecs++) {
      await attendre(delaiRetry(echecs));
      if (this.detruit || this.source() !== 'local') {
        return;
      }
      if (await this.recupererServeur(true)) {
        return;
      }
    }
  }

  private versErreurChargement(erreur: unknown): ErreurChargement {
    const code = codeErreur(erreur);

    if (code === 'LIEN_EXPIRE') {
      return {
        code,
        message: 'Ce lien a expiré. Demandez-en un nouveau au bailleur.',
      };
    }
    if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
      return {
        code: 'LIEN_INVALIDE',
        message:
          'Ce lien n’est pas valable. Vérifiez qu’il est complet, ou demandez-en un nouveau au bailleur.',
      };
    }
    if (estTransitoire(erreur)) {
      return {
        code: null,
        message:
          'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.',
      };
    }

    return { code: null, message: 'Le document n’a pas pu être chargé.' };
  }
}
