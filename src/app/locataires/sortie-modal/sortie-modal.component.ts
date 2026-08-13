import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { LocataireDto } from '../../model/LocataireDto.model';

/**
 * Sortie d'un locataire du logement. Une modale plutôt qu'un `confirm()` :
 * contrairement à la suppression qu'elle remplace, la sortie porte une date, et
 * c'est elle qui range la fiche dans l'onglet des locataires sortis.
 */
@Component({
    selector: 'app-sortie-modal',
    imports: [ReactiveFormsModule],
    templateUrl: './sortie-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./sortie-modal.component.scss']
})
export class SortieModalComponent implements OnInit {
  @Input() locataire: LocataireDto | null = null;
  /** Un enregistrement en cours verrouille les boutons sans fermer la modale. */
  @Input() traitementEnCours = false;
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      sortie: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Le départ se constate le plus souvent le jour même ; une sortie déjà
    // saisie que l'on rouvrirait se représente telle quelle.
    this.form.patchValue({
      sortie: this.locataire?.sortie ?? this.dateIso(new Date()),
    });
  }

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  onConfirm() {
    if (this.form.invalid || this.traitementEnCours) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirm.emit(this.form.value.sortie);
  }

  onCancel() {
    if (!this.traitementEnCours) {
      this.cancel.emit();
    }
  }

  /** `<input type="date">` attend « AAAA-MM-JJ », dans le fuseau local. */
  private dateIso(date: Date): string {
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${mois}-${jour}`;
  }
}
