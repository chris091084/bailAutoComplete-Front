/**
 * Calcul du prorata du premier mois, partagé par la génération du bail
 * (`DocGeneratorService`) et le mail d'envoi (`BailEnvoiService`) : les deux
 * doivent annoncer le même montant.
 */

/**
 * Jours restants dans le mois, jour d'entrée inclus : un emménagement le 15
 * dans un mois de 31 jours en compte 17 (31 - 15 + 1).
 */
export function joursRestantsDansLeMois(date: Date): number {
  const dernierJour = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();

  return dernierJour - date.getDate() + 1;
}

/** `moisUnIndexe` en 1-12 (janvier = 1), comme le rend `getMonth() + 1`. */
export function nombreDeJoursDuMois(
  moisUnIndexe: number,
  annee: number,
): number {
  return new Date(annee, moisUnIndexe, 0).getDate();
}
