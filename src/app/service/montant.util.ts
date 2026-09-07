/**
 * 550 -> « 550 ». Les loyers sont des montants ronds : pas de décimales
 * inutiles sur une quittance ou un mail.
 *
 * Les centimes ne s'écrivent que s'il y en a — un loyer à 550,50 € ne doit pas
 * s'arrondir — et prennent alors la virgule décimale française.
 */
export function formaterMontant(valeur: number): string {
  const montant = Number.isFinite(valeur) ? valeur : 0;

  return Number.isInteger(montant)
    ? String(montant)
    : montant.toFixed(2).replace('.', ',');
}
