import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocataireDto } from '../../model/LocataireDto.model';

/**
 * Confirmation avant l'envoi d'une lettre de congé. Une modale plutôt qu'un
 * `confirm()` : le courrier part par mail et ne se rattrape pas, l'écran doit
 * pouvoir nommer le destinataire et signaler qu'une lettre est déjà partie.
 */
@Component({
  selector: 'app-resiliation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resiliation-modal.component.html',
  styleUrls: ['./resiliation-modal.component.scss'],
})
export class ResiliationModalComponent {
  @Input() locataire: LocataireDto | null = null;
  /** Un envoi déjà en cours verrouille les boutons sans fermer la modale. */
  @Input() envoiEnCours = false;
  @Output() confirm = new EventEmitter<LocataireDto>();
  @Output() cancel = new EventEmitter<void>();

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  onConfirm() {
    if (this.locataire && !this.envoiEnCours) {
      this.confirm.emit(this.locataire);
    }
  }

  onCancel() {
    if (!this.envoiEnCours) {
      this.cancel.emit();
    }
  }
}
