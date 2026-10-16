import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { firstValueFrom, forkJoin } from 'rxjs';

import { EtatLocataireEnum } from '../model/enum.model';
import { LocataireDto } from '../model/LocataireDto.model';
import {
  EtatsDesLieuxAdminService,
  LienEtatDesLieux,
  ResumeEtatDesLieux,
  StatutEdl,
  TypeEdl,
} from '../service/etats-des-lieux-admin.service';
import { messageErreurHttp } from '../service/http-error.util';
import { RequestService } from '../service/requestService';

const LIBELLES_STATUT: Record<StatutEdl, { texte: string; classe: string }> = {
  draft: { texte: 'En cours', classe: 'text-bg-secondary' },
  validated: { texte: 'Validé', classe: 'text-bg-info' },
  signed: { texte: 'Signé', classe: 'text-bg-success' },
};

/**
 * Côté bailleur : créer un état des lieux, obtenir le lien à transmettre au
 * locataire (copier ou envoyer par e-mail), suivre l'avancement, télécharger le
 * PDF. Le locataire, lui, n'a besoin que du lien.
 */
@Component({
  selector: 'app-etats-des-lieux-admin',
  imports: [DatePipe, FormsModule],
  templateUrl: './etats-des-lieux-admin.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class EtatsDesLieuxAdminComponent implements OnInit {
  private readonly api = inject(EtatsDesLieuxAdminService);
  private readonly requests = inject(RequestService);

  readonly liste = signal<ResumeEtatDesLieux[]>([]);
  readonly locataires = signal<LocataireDto[]>([]);
  readonly chargement = signal(true);
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  /** Lien qu'on vient de créer ou de renouveler, à transmettre. */
  readonly lienAffiche = signal<(LienEtatDesLieux & { nom: string }) | null>(null);

  readonly nouveauLocataireId = signal<number | null>(null);
  readonly nouveauType = signal<TypeEdl>('entree');

  readonly libellesStatut = LIBELLES_STATUT;
  private readonly noms = computed(
    () =>
      new Map(
        this.locataires().map((l) => [l.id, `${l.prenom} ${l.nom}`] as const),
      ),
  );

  nomLocataire(id: number): string {
    return this.noms().get(id) ?? `Locataire n°${id}`;
  }

  ngOnInit(): void {
    void this.charger();
  }

  async charger(): Promise<void> {
    this.chargement.set(true);
    try {
      // Les trois onglets de la page Locataires : un état des lieux de sortie
      // concerne un sorti, une entrée un candidat.
      const [liste, actifs, candidats, sortis] = await firstValueFrom(
        forkJoin([
          this.api.lister(),
          this.requests.getLocataires(EtatLocataireEnum.LOCATAIRE),
          this.requests.getLocataires(EtatLocataireEnum.CANDIDAT),
          this.requests.getLocataires(EtatLocataireEnum.SORTI),
        ]),
      );
      this.liste.set(liste);
      this.locataires.set([...actifs, ...candidats, ...sortis]);
    } catch (e) {
      this.erreur.set(messageErreurHttp(e, 'La liste n’a pas pu être chargée'));
    } finally {
      this.chargement.set(false);
    }
  }

  async creer(): Promise<void> {
    const locataireId = this.nouveauLocataireId();
    if (locataireId === null) {
      return;
    }

    await this.agir(async () => {
      const lien = await firstValueFrom(this.api.creer(locataireId, this.nouveauType()));
      this.lienAffiche.set({ ...lien, nom: this.nomLocataire(locataireId) });
      this.nouveauLocataireId.set(null);
      await this.charger();
    }, 'La création a échoué');
  }

  async nouveauLien(ligne: ResumeEtatDesLieux): Promise<void> {
    if (
      !window.confirm(
        'Créer un nouveau lien ? L’ancien cessera immédiatement de fonctionner.',
      )
    ) {
      return;
    }
    await this.agir(async () => {
      const lien = await firstValueFrom(this.api.regenererLien(ligne.id));
      this.lienAffiche.set({ ...lien, nom: this.nomLocataire(ligne.locataireId) });
    }, 'Le lien n’a pas pu être renouvelé');
  }

  async envoyerLien(ligne: ResumeEtatDesLieux): Promise<void> {
    await this.agir(async () => {
      const { envoyeA } = await firstValueFrom(this.api.envoyerLien(ligne.id));
      this.info.set(`Lien envoyé à ${envoyeA}.`);
    }, 'L’e-mail n’a pas pu être envoyé');
  }

  async rouvrir(ligne: ResumeEtatDesLieux): Promise<void> {
    await this.agir(async () => {
      await firstValueFrom(this.api.rouvrir(ligne.id));
      this.info.set('Document rouvert : le locataire peut de nouveau modifier.');
      await this.charger();
    }, 'La réouverture a échoué');
  }

  async renvoyer(ligne: ResumeEtatDesLieux): Promise<void> {
    await this.agir(async () => {
      const suites = await firstValueFrom(this.api.renvoyer(ligne.id));
      this.info.set(
        suites.pdf
          ? `PDF renvoyé (${[suites.emailLocataire && 'locataire', suites.emailBailleur && 'bailleur'].filter(Boolean).join(' et ') || 'aucun e-mail parti'}).`
          : 'Le PDF n’a pas pu être fabriqué : réessayez dans un instant.',
      );
    }, 'Le renvoi a échoué');
  }

  async telechargerPdf(ligne: ResumeEtatDesLieux): Promise<void> {
    await this.agir(async () => {
      const pdf = await firstValueFrom(this.api.pdf(ligne.id));
      saveAs(pdf, `etat-des-lieux-${ligne.type}-${this.nomLocataire(ligne.locataireId)}.pdf`);
    }, 'Le PDF n’a pas pu être téléchargé');
  }

  async copier(lien: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(lien);
      this.info.set('Lien copié.');
    } catch {
      this.erreur.set('La copie a échoué : sélectionnez le lien et copiez-le à la main.');
    }
  }

  /** Enveloppe commune : verrou anti double-clic, effacement des messages, erreur lisible. */
  private async agir(action: () => Promise<void>, contexte: string): Promise<void> {
    this.erreur.set(null);
    this.info.set(null);
    this.enCours.set(true);
    try {
      await action();
    } catch (e) {
      this.erreur.set(messageErreurHttp(e, contexte));
    } finally {
      this.enCours.set(false);
    }
  }
}

