import {
  ElementDto,
  EtatDesLieuxDto,
  EtatElement,
  StatutValidation,
} from '../etat-des-lieux.model';

/**
 * Une saisie du locataire pas encore confirmée par le serveur, gardée sur
 * l'appareil (IndexedDB). Il n'y en a qu'UNE par élément : une nouvelle saisie
 * se FUSIONNE dans la précédente (le dernier mot l'emporte champ par champ),
 * ce qui évite de rejouer dix étapes intermédiaires après une coupure.
 */
export interface EcritureLocale {
  /** `${docId}:${elementId}` — clé de stockage. */
  cle: string;
  docId: string;
  elementId: string;
  champs: {
    etatLocataire?: EtatElement | null;
    commentaireLocataire?: string | null;
    statutValidation?: StatutValidation;
  };
  /** Instant de la DERNIÈRE saisie fusionnée, mesuré par l'appareil (ISO 8601). */
  modifieLe: string;
  /**
   * Compteur incrémenté à chaque fusion. L'envoi en cours ne supprime
   * l'écriture que si ce compteur n'a pas bougé : une saisie faite PENDANT
   * l'envoi doit survivre et partir ensuite.
   */
  seq: number;
}

/** Dernier état connu du document côté serveur, pour rouvrir la page hors ligne. */
export interface DocumentLocal {
  docId: string;
  snapshot: EtatDesLieuxDto;
  enregistreLe: string;
}

export const cleEcriture = (docId: string, elementId: string): string =>
  `${docId}:${elementId}`;

/**
 * L'identifiant du document est dans le jeton du lien (champ `sub` du JWT) :
 * il sert de clé de stockage local. On ne VÉRIFIE pas la signature ici (le
 * navigateur n'a pas la clé, et ce n'est qu'une clé de rangement) : c'est le
 * serveur qui contrôle le jeton à chaque appel.
 */
export function docIdDepuisToken(token: string): string | null {
  try {
    const charge = token.split('.')[1];
    if (!charge) {
      return null;
    }
    const base64 = charge.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === 'string' && sub !== '' ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Superpose les saisies locales en attente sur la version serveur : c'est ce
 * que le locataire voit. Une saisie plus ANCIENNE que celle du serveur est
 * ignorée (le serveur a déjà mieux) — la règle « le plus récent gagne ».
 */
export function appliquerEcritures(
  document: EtatDesLieuxDto | null,
  ecritures: ReadonlyMap<string, EcritureLocale>,
): EtatDesLieuxDto | null {
  if (document === null || ecritures.size === 0) {
    return document;
  }

  const parElement = new Map<string, EcritureLocale>();
  for (const ecriture of ecritures.values()) {
    parElement.set(ecriture.elementId, ecriture);
  }

  return {
    ...document,
    pieces: document.pieces.map((piece) => ({
      ...piece,
      elements: piece.elements.map((element) => {
        const ecriture = parElement.get(element.id);
        return ecriture && estPlusRecente(ecriture, element)
          ? superposer(element, ecriture)
          : element;
      }),
    })),
  };
}

function estPlusRecente(ecriture: EcritureLocale, element: ElementDto): boolean {
  return (
    element.dateModifLocataire === null ||
    Date.parse(ecriture.modifieLe) >= Date.parse(element.dateModifLocataire)
  );
}

function superposer(element: ElementDto, ecriture: EcritureLocale): ElementDto {
  return {
    ...element,
    ...ecriture.champs,
    dateModifLocataire: ecriture.modifieLe,
  };
}

/**
 * Au chargement, tri des saisies locales face à la version du serveur :
 *   - serveur STRICTEMENT plus récent (modifié depuis un autre appareil) :
 *     la saisie locale est périmée, on l'abandonne ;
 *   - sinon on la garde (à égalité, c'est un rejeu : le serveur l'acceptera).
 */
export function reconcilier(
  serveur: EtatDesLieuxDto,
  ecritures: EcritureLocale[],
): { gardees: EcritureLocale[]; abandonnees: EcritureLocale[] } {
  const elements = new Map(
    serveur.pieces.flatMap((p) => p.elements).map((e) => [e.id, e]),
  );
  const gardees: EcritureLocale[] = [];
  const abandonnees: EcritureLocale[] = [];

  for (const ecriture of ecritures) {
    const element = elements.get(ecriture.elementId);
    if (element && estPlusRecente(ecriture, element)) {
      gardees.push(ecriture);
    } else {
      abandonnees.push(ecriture);
    }
  }

  return { gardees, abandonnees };
}

const RETRY_BASE_MS = 15_000;
const RETRY_MAX_MS = 30_000;

/**
 * Délai avant le prochain essai de secours : 15 s, puis 22,5 s, puis 30 s
 * (plafond) tant que ça échoue. `echecsConsecutifs` repart de 0 au premier succès.
 */
export const delaiRetry = (echecsConsecutifs: number): number =>
  Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 1.5 ** Math.max(0, echecsConsecutifs));
