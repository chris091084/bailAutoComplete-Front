/**
 * Une photo gardée sur l'appareil, avec SON PROPRE statut de synchronisation
 * (indépendant de celui des saisies d'éléments).
 *
 *   attente ──envoi réussi──► envoyee        (le Blob reste pour l'affichage)
 *      └────suppression────► (effacée)       si jamais partie
 *   envoyee ──suppression──► suppression ──DELETE réussi──► (effacée)
 *
 * Le fichier est un `Blob` (octets bruts), pas du base64 : un tiers plus léger
 * que le même contenu encodé, et l'affichage se fait sans conversion.
 */
export type StatutPhotoLocale = 'attente' | 'envoyee' | 'suppression';

export interface PhotoLocale {
  /** UUID choisi à la prise de vue : un envoi rejoué retombe sur la même photo. */
  id: string;
  docId: string;
  elementId: string;
  /** Absent pour une pierre tombale de photo connue seulement du serveur. */
  blob: Blob | null;
  statut: StatutPhotoLocale;
  creeLe: string;
}

/** Nombre maximal de photos par élément (aligné sur `PHOTOS_MAX_PAR_ELEMENT` du backend). */
export const PHOTOS_MAX_PAR_ELEMENT = 5;

/** Ce qu'affichent les vignettes : une photo, d'où qu'elle vienne. */
export interface VuePhoto {
  id: string;
  src: string;
  /** `attente` = pas encore confirmée par le serveur (⟳ orange), sinon ✓ vert. */
  statut: 'attente' | 'synchronise';
}
