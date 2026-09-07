import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

/**
 * Édition du corps du mail avant envoi, en texte enrichi.
 *
 * Ouverte depuis `ApercuBailModalComponent` (écran de génération) et
 * `EnvoiBailModalComponent` (liste des locataires) : les deux affichent le
 * même mail par défaut (`BailEnvoiService.corpsMailParDefaut`) et doivent
 * pouvoir le corriger de la même façon avant qu'il ne parte.
 */
@Component({
  selector: 'app-edit-mail-modal',
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './edit-mail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./edit-mail-modal.component.scss'],
})
export class EditMailModalComponent {
  /** Le mail tel qu'affiché à l'ouverture : le défaut, ou une saisie reprise. */
  @Input() set corpsMail(html: string) {
    this.contenu = html;
  }

  @Output() valider = new EventEmitter<string>();
  @Output() annuler = new EventEmitter<void>();

  contenu = '';

  readonly toolbar = [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ];

  onValider() {
    this.valider.emit(this.contenu);
  }

  onAnnuler() {
    this.annuler.emit();
  }
}
