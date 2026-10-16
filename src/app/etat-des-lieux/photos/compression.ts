import { Injectable } from '@angular/core';

/** Largeur maximale d'une photo envoyée : lisible sur un PDF A4, sans peser des mégaoctets. */
export const LARGEUR_MAX = 1600;
export const QUALITE_JPEG = 0.8;

/** Réduit en gardant les proportions ; n'agrandit jamais une petite image. */
export function calculerDimensions(
  largeur: number,
  hauteur: number,
  max = LARGEUR_MAX,
): { largeur: number; hauteur: number } {
  if (largeur <= max) {
    return { largeur, hauteur };
  }
  return {
    largeur: max,
    hauteur: Math.max(1, Math.round((hauteur * max) / largeur)),
  };
}

/** Ce que `compresserImage` demande au navigateur, séparé pour pouvoir le simuler. */
export interface OutilsImage {
  decoder(fichier: Blob): Promise<{ largeur: number; hauteur: number; dessiner: (ctx: CanvasRenderingContext2D, l: number, h: number) => void; liberer: () => void }>;
  creerCanvas(largeur: number, hauteur: number): HTMLCanvasElement;
}

/**
 * Décodage via le navigateur. `imageOrientation: 'from-image'` applique la
 * rotation EXIF : sans elle, une photo de téléphone tenu en portrait s'afficherait
 * couchée une fois ré-encodée.
 */
const outilsNavigateur: OutilsImage = {
  async decoder(fichier) {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(fichier, {
        imageOrientation: 'from-image',
      });
      return {
        largeur: bitmap.width,
        hauteur: bitmap.height,
        dessiner: (ctx, l, h) => ctx.drawImage(bitmap, 0, 0, l, h),
        liberer: () => bitmap.close(),
      };
    }

    // Repli (anciens navigateurs) : `<img>` applique déjà l'orientation EXIF.
    const url = URL.createObjectURL(fichier);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image illisible'));
      image.src = url;
    });
    return {
      largeur: image.naturalWidth,
      hauteur: image.naturalHeight,
      dessiner: (ctx, l, h) => ctx.drawImage(image, 0, 0, l, h),
      liberer: () => URL.revokeObjectURL(url),
    };
  },
  creerCanvas: (largeur, hauteur) => {
    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    return canvas;
  },
};

/**
 * Redimensionne (~1600 px de large) et ré-encode en JPEG avant tout stockage ou
 * envoi. Ré-encoder via un canvas EFFACE au passage les métadonnées EXIF (dont la
 * position GPS du logement) : c'est voulu, par minimisation des données.
 */
export async function compresserImage(
  fichier: Blob,
  outils: OutilsImage = outilsNavigateur,
): Promise<Blob> {
  const image = await outils.decoder(fichier);

  try {
    const { largeur, hauteur } = calculerDimensions(image.largeur, image.hauteur);
    const canvas = outils.creerCanvas(largeur, hauteur);
    const contexte = canvas.getContext('2d');
    if (!contexte) {
      throw new Error('Canvas indisponible');
    }
    image.dessiner(contexte, largeur, hauteur);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Encodage impossible'))),
        'image/jpeg',
        QUALITE_JPEG,
      ),
    );
  } finally {
    image.liberer();
  }
}

/**
 * Porte d'entrée injectable de la compression : les composants la demandent par
 * injection, ce qui permet aux tests de la remplacer (le vrai travail exige un
 * navigateur, avec canvas et décodeur d'images).
 */
@Injectable({ providedIn: 'root' })
export class CompressionImageService {
  compresser(fichier: Blob): Promise<Blob> {
    return compresserImage(fichier);
  }
}
