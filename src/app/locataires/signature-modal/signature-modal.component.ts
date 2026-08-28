import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { LocataireDto } from '../../model/LocataireDto.model';

/**
 * Passage d'un candidat en locataire, une fois son bail signé. Une modale
 * plutôt qu'un `confirm()` : la transition ouvre les quittances et le congé sur
 * la fiche, et rien ne la rejoue en sens inverse — elle mérite d'être nommée.
 *
 * Aucune saisie, contrairement à la sortie : la signature est un fait, pas une
 * date à renseigner. La modale ne fait donc que demander confirmation.
 */
@Component({
  selector: 'app-signature-modal',
  imports: [],
  templateUrl: './signature-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SignatureModalComponent {
  @Input() locataire: LocataireDto | null = null;
  /** Un enregistrement en cours verrouille les boutons sans fermer la modale. */
  @Input() traitementEnCours = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  onConfirm() {
    if (!this.traitementEnCours) {
      this.confirm.emit();
    }
  }

  onCancel() {
    if (!this.traitementEnCours) {
      this.cancel.emit();
    }
  }
}
