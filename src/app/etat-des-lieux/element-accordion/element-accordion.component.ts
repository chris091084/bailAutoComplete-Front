import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { EtatChipsComponent } from '../etat-chips/etat-chips.component';
import { PhotoPickerComponent } from '../photos/photo-picker.component';
import { EtatDesLieuxStore } from '../etat-des-lieux.store';
import {
  ElementDto,
  EtatElement,
  aSaisieLocataire,
  etatEffectif,
  libelleEtat,
} from '../etat-des-lieux.model';

/**
 * Une ligne du formulaire (« Murs », « Sols »…) : une barre toujours visible et
 * une zone de modification qui se déplie.
 *
 *   ┌ Murs  [validé] ─────────────────────────────┐
 *   │ [Bailleur] Bon état — peinture récente      │   ← référence (bleu)
 *   │ [Vous] État moyen — tache · 15/10 10:02     │   ← saisie du locataire (jaune)
 *   │                          (✓)  [Modifier]    │
 *   └──────────────────────────────────────────────┘
 *
 * Le composant lit et écrit via le store de la page : il ne connaît pas HTTP.
 */
@Component({
  selector: 'app-element-accordion',
  imports: [ReactiveFormsModule, DatePipe, EtatChipsComponent, PhotoPickerComponent],
  templateUrl: './element-accordion.component.html',
  styleUrl: './element-accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ElementAccordionComponent {
  protected readonly store = inject(EtatDesLieuxStore);

  readonly element = input.required<ElementDto>();

  readonly ouvert = signal(false);
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);

  /** Brouillon de la zone d'édition : ne touche l'élément qu'à la confirmation. */
  readonly etat = new FormControl<EtatElement | null>(null);
  readonly commentaire = new FormControl('', { nonNullable: true });

  readonly valide = computed(() => this.element().statutValidation === 'valide');
  /** ⟳ orange tant que la saisie n'est pas confirmée par le serveur, ✓ vert ensuite. */
  readonly etatSync = computed(() => this.store.etatSync(this.element().id));
  readonly nbPhotos = computed(
    () => this.store.photosParElement().get(this.element().id)?.length ?? 0,
  );
  readonly aSaisie = computed(() => aSaisieLocataire(this.element()));
  readonly aReference = computed(
    () =>
      this.element().etatBailleur !== null ||
      this.element().commentaireBailleur !== null,
  );
  /** Sortie sans référence : on le dit, plutôt que de laisser un trou. */
  readonly sansReference = computed(
    () => !this.aReference() && this.store.document()?.type === 'sortie',
  );
  /**
   * La coche accepte l'état connu tel quel : sans aucun état (entrée sans
   * référence), il n'y a rien à accepter, le locataire passe par « Modifier ».
   */
  readonly peutValiderRapidement = computed(
    () =>
      this.store.modifiable() &&
      !this.valide() &&
      etatEffectif(this.element()) !== null &&
      !this.enregistrement(),
  );

  readonly libelle = libelleEtat;

  basculer(): void {
    if (this.ouvert()) {
      this.ouvert.set(false);
      return;
    }

    // Pré-sélection sur la valeur actuelle : celle du locataire, à défaut la
    // référence. Le commentaire, lui, ne reprend que la saisie du locataire.
    this.etat.setValue(etatEffectif(this.element()));
    this.commentaire.setValue(this.element().commentaireLocataire ?? '');
    this.erreur.set(null);
    this.ouvert.set(true);
  }

  async validerRapidement(): Promise<void> {
    this.erreur.set(null);
    this.enregistrement.set(true);
    const resultat = await this.store.validerRapidement(this.element().id);
    this.enregistrement.set(false);

    if (!resultat.ok) {
      this.erreur.set(resultat.message ?? 'L’enregistrement a échoué.');
    }
  }

  async confirmer(): Promise<void> {
    if (this.etat.value === null) {
      return;
    }

    this.erreur.set(null);
    this.enregistrement.set(true);
    const resultat = await this.store.confirmerModification(
      this.element().id,
      this.etat.value,
      this.commentaire.value,
    );
    this.enregistrement.set(false);

    if (resultat.ok) {
      this.ouvert.set(false);
    } else {
      this.erreur.set(resultat.message ?? 'L’enregistrement a échoué.');
    }
  }
}
