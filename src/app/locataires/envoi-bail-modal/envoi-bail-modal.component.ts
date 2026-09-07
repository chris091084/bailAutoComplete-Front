import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LocataireDto } from '../../model/LocataireDto.model';
import { EditMailModalComponent } from '../../edit-mail-modal/edit-mail-modal.component';

/** Ce que l'API sait convertir ou joindre tel quel. */
const EXTENSIONS_ACCEPTEES = /\.(docx|pdf)$/i;

/**
 * Cinq Mo : la limite de `POST /documents/pdf`, au-delà de laquelle la
 * conversion est refusée. Autant le dire ici plutôt qu'après l'envoi.
 */
const TAILLE_MAX = 5 * 1024 * 1024;

/** Ce que l'envoi porte : les fichiers déposés, et le mail tel qu'il partira. */
export interface EnvoiBailPayload {
  fichiers: File[];
  corpsMail: string;
}

/**
 * Envoi du projet de bail à un candidat, depuis sa ligne.
 *
 * Le bail n'est pas conservé côté serveur : c'est l'utilisateur qui dépose le
 * fichier, ce qui est le point de la chose — il l'a ouvert dans Word, vérifié sa
 * mise en page, corrigé ce qu'il fallait, et c'est cette version relue qui part.
 *
 * La confirmation est fondue dans cette modale plutôt qu'empilée par-dessus
 * comme pour la quittance : celle-ci nomme déjà le destinataire et son adresse,
 * une seconde fenêtre ne dirait rien de plus.
 */
@Component({
  selector: 'app-envoi-bail-modal',
  imports: [CommonModule, EditMailModalComponent],
  templateUrl: './envoi-bail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./envoi-bail-modal.component.scss'],
})
export class EnvoiBailModalComponent {
  @Input() locataire: LocataireDto | null = null;
  /** Un envoi en cours verrouille les boutons sans fermer la modale. */
  @Input() envoiEnCours = false;
  /** Le mail par défaut, calculé par le parent (`BailEnvoiService.corpsMailParDefaut`). */
  @Input() set corpsMail(html: string) {
    this.corpsMailActuel = html;
  }

  @Output() envoyer = new EventEmitter<EnvoiBailPayload>();
  @Output() cancel = new EventEmitter<void>();

  fichiers: File[] = [];
  /** Ce que le dépôt a écarté : extension inconnue, fichier trop lourd. */
  fichiersRefuses: string[] = [];
  /** Le mail tel qu'il sera envoyé : le défaut reçu, ou la relecture validée. */
  corpsMailActuel = '';
  /** `true` dès que le mail a été relu et validé dans l'éditeur. */
  corpsMailModifie = false;
  /** Bascule le corps de la modale vers l'éditeur de mail. */
  modaleMailOuverte = false;

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  get peutEnvoyer(): boolean {
    return (
      !this.envoiEnCours &&
      this.fichiers.length > 0 &&
      !!this.locataire?.email
    );
  }

  onFichiersChoisis(evenement: Event) {
    const input = evenement.target as HTMLInputElement;
    const deposes = Array.from(input.files ?? []);

    this.fichiers = [];
    this.fichiersRefuses = [];

    for (const fichier of deposes) {
      if (!EXTENSIONS_ACCEPTEES.test(fichier.name)) {
        this.fichiersRefuses.push(
          `${fichier.name} : seuls les fichiers .docx et .pdf sont acceptés.`,
        );
        continue;
      }

      if (fichier.size > TAILLE_MAX) {
        this.fichiersRefuses.push(
          `${fichier.name} : ${this.taille(fichier.size)}, au-delà des 5 Mo acceptés.`,
        );
        continue;
      }

      this.fichiers.push(fichier);
    }
  }

  /** « 128 ko », « 1,4 Mo ». */
  taille(octets: number): string {
    return octets >= 1024 * 1024
      ? `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
      : `${Math.round(octets / 1024)} ko`;
  }

  /** Les `.docx` passeront par LibreOffice, les PDF partent tels quels. */
  seraConverti(fichier: File): boolean {
    return /\.docx$/i.test(fichier.name);
  }

  onEnvoyer() {
    if (this.peutEnvoyer) {
      this.envoyer.emit({
        fichiers: this.fichiers,
        corpsMail: this.corpsMailActuel,
      });
    }
  }

  onCancel() {
    if (!this.envoiEnCours) {
      this.cancel.emit();
    }
  }

  onModifierMail() {
    this.modaleMailOuverte = true;
  }

  onMailModifie(html: string) {
    this.corpsMailActuel = html;
    this.corpsMailModifie = true;
    this.modaleMailOuverte = false;
  }

  onAnnulerModificationMail() {
    this.modaleMailOuverte = false;
  }
}
