import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { EtatDesLieuxStore } from '../etat-des-lieux.store';
import { PHOTOS_MAX_PAR_ELEMENT, VuePhoto } from '../hors-ligne/photo-locale';
import { CompressionImageService } from './compression';
import { PhotoViewerComponent } from './photo-viewer.component';

/**
 * Photos d'un élément : vignettes (avec suppression), bouton « Ajouter », et
 * visionneuse plein écran au clic. Chaque photo est compressée (~1600 px, JPEG)
 * puis gardée sur l'appareil avant d'être envoyée : l'ajout ne dépend jamais du
 * réseau.
 */
@Component({
  selector: 'app-photo-picker',
  imports: [PhotoViewerComponent],
  templateUrl: './photo-picker.component.html',
  styleUrl: './photo-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PhotoPickerComponent {
  protected readonly store = inject(EtatDesLieuxStore);
  private readonly compression = inject(CompressionImageService);

  readonly elementId = input.required<string>();

  readonly max = PHOTOS_MAX_PAR_ELEMENT;
  readonly photos = computed<VuePhoto[]>(
    () => this.store.photosParElement().get(this.elementId()) ?? [],
  );
  readonly complet = computed(() => this.photos().length >= this.max);
  readonly traitement = signal(false);
  readonly erreur = signal<string | null>(null);
  /** Index de la photo ouverte en plein écran, `null` si la visionneuse est fermée. */
  readonly ouverte = signal<number | null>(null);

  async choisir(evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    // Vidé pour que reprendre la MÊME photo redéclenche l'événement.
    champ.value = '';
    if (!fichier) {
      return;
    }

    this.erreur.set(null);
    this.traitement.set(true);
    try {
      const compresse = await this.compression.compresser(fichier);
      const resultat = await this.store.ajouterPhoto(this.elementId(), compresse);
      if (!resultat.ok) {
        this.erreur.set(resultat.message ?? 'La photo n’a pas pu être ajoutée.');
      }
    } catch {
      this.erreur.set('Cette photo n’a pas pu être traitée. Essayez-en une autre.');
    } finally {
      this.traitement.set(false);
    }
  }

  supprimer(photo: VuePhoto): Promise<void> {
    return this.store.supprimerPhoto(this.elementId(), photo.id);
  }
}
