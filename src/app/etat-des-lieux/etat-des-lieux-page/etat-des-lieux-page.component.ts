import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ElementManquant } from '../etat-des-lieux.model';
import { EtatDesLieuxStore } from '../etat-des-lieux.store';
import {
  EtatDesLieuxStockage,
  IdbEtatDesLieuxStockage,
} from '../hors-ligne/etat-des-lieux-stockage';
import { SyncQueueService } from '../hors-ligne/sync-queue.service';
import { SyncStatusBannerComponent } from '../hors-ligne/sync-status-banner/sync-status-banner.component';
import { PieceSectionComponent } from '../piece-section/piece-section.component';
import { SignaturePadComponent } from '../signature/signature-pad.component';

/**
 * Page du locataire, ouverte depuis le lien reçu : charge le document désigné
 * par le jeton de l'URL, affiche les pièces et le pied de page collant.
 *
 * Elle FOURNIT le store (`providers`) : chaque ouverture de la page repart
 * d'un état neuf, et les composants enfants le retrouvent par injection.
 */
@Component({
  selector: 'app-etat-des-lieux-page',
  imports: [
    PieceSectionComponent,
    SyncStatusBannerComponent,
    SignaturePadComponent,
    DatePipe,
  ],
  providers: [
    EtatDesLieuxStore,
    SyncQueueService,
    // Sur l'appareil : IndexedDB. Les tests branchent leur propre stockage.
    { provide: EtatDesLieuxStockage, useExisting: IdbEtatDesLieuxStockage },
  ],
  templateUrl: './etat-des-lieux-page.component.html',
  styleUrl: './etat-des-lieux-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class EtatDesLieuxPageComponent implements OnInit {
  protected readonly store = inject(EtatDesLieuxStore);
  private readonly route = inject(ActivatedRoute);

  readonly titre = computed(() =>
    this.store.document()?.type === 'sortie'
      ? 'État des lieux de sortie'
      : 'État des lieux d’entrée',
  );

  /** Message du pied de page : ce qui empêche (ou non) de signer. */
  readonly messagePied = computed(() => {
    const restants = this.store.restants();
    const aEnvoyer = this.store.nonSynchronises();

    if (restants > 0) {
      return restants === 1
        ? '1 élément restant à valider'
        : `${restants} éléments restants à valider`;
    }
    if (aEnvoyer > 0) {
      return aEnvoyer === 1
        ? 'Synchronisation en cours : 1 élément à envoyer avant de signer'
        : `Synchronisation en cours : ${aEnvoyer} éléments à envoyer avant de signer`;
    }
    if (this.store.source() !== 'serveur') {
      return 'Connexion au serveur en cours avant de signer…';
    }
    return 'Tous les éléments sont traités';
  });

  /**
   * « Tout valider et signer » : actif seulement quand tout est traité, que
   * rien n'attend d'être envoyé, et que le serveur a confirmé le document — on
   * ne signe pas sur une copie locale.
   */
  readonly peutSigner = computed(
    () =>
      this.store.modifiable() &&
      this.store.restants() === 0 &&
      this.store.nonSynchronises() === 0 &&
      this.store.source() === 'serveur' &&
      this.store.file.bloque() === null,
  );

  // --- Signature -------------------------------------------------------------
  readonly signatureOuverte = signal(false);
  /** PNG dessiné, `null` tant que la zone est vide. Gardé en mémoire seulement (jamais stocké). */
  readonly signatureImage = signal<string | null>(null);
  readonly certifie = signal(false);
  readonly erreurSignature = signal<string | null>(null);
  readonly manquants = signal<ElementManquant[]>([]);

  readonly pretASigner = computed(
    () => this.signatureImage() !== null && this.certifie() && !this.store.signatureEnCours(),
  );

  /** Ce que le locataire s'apprête à signer : un résumé, pour qu'il sache ce qu'il engage. */
  readonly resume = computed(() => {
    const total = this.store.elements().length;
    const photos = [...this.store.photosParElement().values()].reduce((n, l) => n + l.length, 0);
    return `${total} élément${total > 1 ? 's' : ''}, ${photos} photo${photos > 1 ? 's' : ''}`;
  });

  /** Message de fin selon ce qui a suivi la signature (PDF, e-mails). */
  readonly messageFinSignature = computed(() => {
    const suites = this.store.suitesSignature();
    if (suites === null) {
      return 'Il est verrouillé : plus rien ne peut être modifié.';
    }
    return suites.emailLocataire
      ? 'Un exemplaire PDF vous a été envoyé par e-mail.'
      : 'Votre signature est enregistrée, mais le PDF n’a pas pu vous être envoyé pour le moment : le bailleur vous le transmettra.';
  });

  ouvrirSignature(): void {
    this.erreurSignature.set(null);
    this.manquants.set([]);
    this.signatureOuverte.set(true);
  }

  fermerSignature(): void {
    if (!this.store.signatureEnCours()) {
      this.signatureOuverte.set(false);
    }
  }

  async signer(): Promise<void> {
    const signature = this.signatureImage();
    if (signature === null || !this.pretASigner()) {
      return;
    }

    this.erreurSignature.set(null);
    const resultat = await this.store.validerEtSigner(signature);

    if (resultat.ok) {
      this.signatureOuverte.set(false);
      this.signatureImage.set(null);
      return;
    }

    this.erreurSignature.set(resultat.message ?? 'La signature a échoué.');
    if (resultat.manquants?.length) {
      this.manquants.set(resultat.manquants);
      this.signatureOuverte.set(false);
    }
  }

  ngOnInit(): void {
    void this.store.charger(this.route.snapshot.paramMap.get('token') ?? '');
  }

  recharger(): void {
    void this.store.charger(this.route.snapshot.paramMap.get('token') ?? '');
  }
}
