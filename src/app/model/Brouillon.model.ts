import { Bailleur } from './bailleur.model';

/** Référence vers une entité déjà enregistrée : l'API n'en lit que l'id. */
export interface Reference {
  id: number;
}

/**
 * Le formulaire de bail tel que l'API l'écrit dans `result_form`, sans
 * document généré ni fiche locataire : une saisie qu'on pourra reprendre.
 */
export interface BrouillonPayload {
  adress?: string | null;
  appartement?: Reference | null;
  chargePrice?: number | null;
  email?: string | null;
  firstname?: string | null;
  from?: string | null;
  to?: string | null;
  motif?: string | null;
  name?: string | null;
  priceNoCharge?: number | null;
  room?: string | null;
  telephone?: string | null;
  bailleur?: Reference | null;
  bailType?: string | null;
  tIrl?: string | null;
  valIrl?: string | null;
  lastPriceWithoutCharge?: number | null;
  chargeList?: boolean | null;
  clauseLess6Month?: boolean | null;
  typeResidence?: string | null;
  rentRef?: number | null;
  rentRefMaj?: number | null;
}

/**
 * Une saisie relue depuis l'API : elle porte son id, seul moyen de la
 * réenregistrer sans la dupliquer, et ses relations sont hydratées.
 */
export interface Brouillon
  extends Omit<BrouillonPayload, 'appartement' | 'bailleur'> {
  id: number;
  appartement?: { id: number; name?: string } | null;
  bailleur?: Bailleur | null;
}
