import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocataireDto } from '../../model/LocataireDto.model';

/**
 * Confirmation avant l'envoi d'un document au locataire — lettre de congé,
 * quittance de loyer. Une modale plutôt qu'un `confirm()` : le document part par
 * mail et ne se rattrape pas, l'écran doit pouvoir nommer le destinataire et,
 * pour la résiliation, signaler qu'une lettre est déjà partie.
 */
@Component({
  selector: 'app-confirmation-envoi-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-envoi-modal.component.html',
  styleUrls: ['./confirmation-envoi-modal.component.scss'],
})
export class ConfirmationEnvoiModalComponent {
  @Input() locataire: LocataireDto | null = null;
  @Input() titre = "Confirmation d'envoi";
  /** Complète « … vouloir envoyer <document> à Jean Dupont ? ». */
  @Input() document = 'ce document';
  @Input() libelleConfirmer = 'Envoyer';
  /** Classe Bootstrap du bouton de confirmation, pour rester dans le ton de
   * l'action déclenchée. */
  @Input() classeConfirmer = 'btn-warning';
  /**
   * Rappelle la date du dernier envoi : propre à la résiliation, seule à être
   * horodatée sur le locataire.
   */
  @Input() rappelerEnvoiPrecedent = false;
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
