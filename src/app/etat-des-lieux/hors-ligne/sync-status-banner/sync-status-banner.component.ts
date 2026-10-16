import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { EtatDesLieuxStore } from '../../etat-des-lieux.store';

type Niveau = 'attente' | 'ok' | 'erreur';

/**
 * Bandeau en haut de page : dit au locataire où en est la sauvegarde.
 *   - orange : « N éléments en attente de synchronisation » (⟳ qui tourne)
 *   - vert   : « Tout est synchronisé »
 *   - rouge  : le lien n'est plus valable, les saisies restent sur l'appareil
 */
@Component({
  selector: 'app-sync-status-banner',
  templateUrl: './sync-status-banner.component.html',
  styleUrl: './sync-status-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SyncStatusBannerComponent {
  protected readonly store = inject(EtatDesLieuxStore);

  readonly niveau = computed<Niveau>(() => {
    if (this.store.file.bloque() !== null) {
      return 'erreur';
    }
    return this.store.nonSynchronises() > 0 ||
      this.store.source() === 'local' ||
      this.store.horsLigne()
      ? 'attente'
      : 'ok';
  });

  readonly message = computed(() => {
    const bloque = this.store.file.bloque();
    const n = this.store.nonSynchronises();

    if (bloque === 'LIEN_EXPIRE') {
      return 'Ce lien a expiré : vos saisies restent sur cet appareil. Demandez un nouveau lien au bailleur pour les envoyer.';
    }
    if (bloque !== null) {
      return 'Ce lien n’est plus valable : vos saisies restent sur cet appareil. Demandez un nouveau lien au bailleur.';
    }
    if (n > 0) {
      const element = n === 1 ? '1 élément en attente' : `${n} éléments en attente`;
      return this.store.horsLigne()
        ? `Hors ligne — ${element} de synchronisation`
        : `${element} de synchronisation`;
    }
    if (this.store.horsLigne()) {
      return 'Hors ligne — vos saisies sont gardées sur cet appareil';
    }
    if (this.store.source() === 'local') {
      return 'Connexion au serveur en cours…';
    }
    return 'Tout est synchronisé';
  });

  /** « Réessayer » n'a de sens que s'il reste quelque chose à envoyer ou à confirmer. */
  readonly peutReessayer = computed(
    () =>
      this.niveau() === 'attente' &&
      !this.store.file.envoiEnCours() &&
      (this.store.nonSynchronises() > 0 || this.store.source() === 'local'),
  );
}
