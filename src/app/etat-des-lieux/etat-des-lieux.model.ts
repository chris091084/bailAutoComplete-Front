/**
 * Contrat de l'API `/etats-des-lieux/:token` côté locataire. Les valeurs
 * d'énumération sont celles du backend (`etat-element.enum.ts`,
 * `etat-des-lieux.enums.ts`) : elles doivent rester identiques.
 */

export type EtatElement = 'NEUF' | 'TRES_BON' | 'BON' | 'MOYEN' | 'MAUVAIS';
export type TypeEtatDesLieux = 'entree' | 'sortie';
export type StatutEtatDesLieux = 'draft' | 'validated' | 'signed';
export type StatutValidation = 'a_verifier' | 'valide';
export type StatutSyncPhoto = 'pending' | 'synced';

/** Les cinq niveaux, du meilleur au pire, avec leur libellé du formulaire Word. */
export const ETATS: readonly { valeur: EtatElement; libelle: string }[] = [
  { valeur: 'NEUF', libelle: 'Neuf' },
  { valeur: 'TRES_BON', libelle: 'Très bon état' },
  { valeur: 'BON', libelle: 'Bon état' },
  { valeur: 'MOYEN', libelle: 'État moyen' },
  { valeur: 'MAUVAIS', libelle: 'Mauvais état' },
];

export function libelleEtat(etat: EtatElement | null): string {
  return ETATS.find((e) => e.valeur === etat)?.libelle ?? '';
}

export interface PhotoDto {
  id: string;
  statutSync: StatutSyncPhoto;
  creeLe: string;
}

export interface ElementDto {
  id: string;
  nom: string;
  ordre: number;
  etatBailleur: EtatElement | null;
  commentaireBailleur: string | null;
  etatLocataire: EtatElement | null;
  commentaireLocataire: string | null;
  dateModifLocataire: string | null;
  statutValidation: StatutValidation;
  updatedAt: string;
  photos: PhotoDto[];
}

export interface PieceDto {
  id: string;
  nom: string;
  ordre: number;
  elements: ElementDto[];
}

export interface EtatDesLieuxDto {
  id: string;
  type: TypeEtatDesLieux;
  statut: StatutEtatDesLieux;
  dateCreation: string;
  dateSignature: string | null;
  referenceDisponible: boolean;
  infos: {
    adresse: string;
    chauffage: string | null;
    clesRemises: string | null;
  };
  locataire: { prenom: string; nom: string };
  bailleur: { nom: string; email: string; telephone: string } | null;
  lienExpireLe: string;
  /** Années de conservation après la fin du bail (mention RGPD). */
  conservationAnnees: number;
  pieces: PieceDto[];
}

/** Corps de `PATCH …/elements/:id` : seuls les champs présents sont écrits. */
export interface ModificationElement {
  etatLocataire?: EtatElement | null;
  commentaireLocataire?: string | null;
  statutValidation?: StatutValidation;
  /** Instant de la saisie, mesuré par l'appareil du locataire (ISO 8601). */
  modifieLe: string;
}

/** Ce qui s'est passé APRÈS la signature (qui, elle, est acquise). */
export interface SuitesSignature {
  pdf: boolean;
  emailLocataire: boolean;
  emailBailleur: boolean;
  archive: boolean;
}

export interface ResultatSignature extends SuitesSignature {
  statut: StatutEtatDesLieux;
  dateSignature: string;
}

/** Un élément que le serveur juge encore non traité (réponse 422 de validate/sign). */
export interface ElementManquant {
  pieceNom: string;
  elementId: string;
  elementNom: string;
}

/** Codes d'erreur renvoyés par l'API dans `error.code`. */
export type CodeErreurEdl =
  | 'LIEN_INVALIDE'
  | 'LIEN_EXPIRE'
  | 'DEJA_SIGNE'
  | 'NON_MODIFIABLE'
  | 'VERSION_PLUS_RECENTE'
  | 'ELEMENTS_MANQUANTS'
  | 'SIGNATURE_INVALIDE';

/** Le locataire a-t-il dit quelque chose sur cet élément ? (affiche le badge jaune) */
export const aSaisieLocataire = (e: ElementDto): boolean =>
  e.etatLocataire !== null || e.commentaireLocataire !== null;

/** État effectif d'un élément : le dernier mot du locataire, sinon la référence. */
export const etatEffectif = (e: ElementDto): EtatElement | null =>
  e.etatLocataire ?? e.etatBailleur;
