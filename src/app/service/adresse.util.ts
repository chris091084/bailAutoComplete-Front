/**
 * Les adresses sont saisies d'un seul tenant — « 56 rue de la Filature - 69100
 * VILLEURBANNE » — alors que les courriers les veulent découpées en lignes. Les
 * découpes partent toutes du premier code postal rencontré, seul repère fiable
 * dans une saisie libre.
 */

/** « 56 rue de la Filature - 69100 VILLEURBANNE » -> « 56 rue de la Filature ». */
export function rueDepuisAdresse(adresse?: string | null): string {
  return adresse?.replace(/[\s,;-]*\d{5}\b[\s\S]*$/, '').trim() ?? '';
}

/** « 56 rue de la Filature - 69100 VILLEURBANNE » -> « 69100 VILLEURBANNE ». */
export function codePostalVilleDepuisAdresse(adresse?: string | null): string {
  return adresse?.match(/\d{5}[\s\S]*$/)?.[0]?.trim() ?? '';
}

/** « 56 rue de la Filature - 69100 VILLEURBANNE » -> « VILLEURBANNE ». */
export function villeDepuisAdresse(adresse?: string | null): string {
  return adresse?.match(/\d{5}\s+(.+)$/)?.[1]?.trim() ?? '';
}

/**
 * « SCI BZHRO, Société civile immobilière au capital de 1000 €, dont le siège
 * est à … » -> « SCI BZHRO ». Les bailleurs personnes morales sont saisis avec
 * toute leur mention légale, celle qui figure sur le bail ; une quittance n'en
 * veut que la dénomination. Hors SCI, le nom est repris tel quel : rien
 * n'indiquerait alors où s'arrête le nom et où commence le reste.
 */
export function nomBailleur(nom?: string | null): string {
  const sci = nom?.match(/^\s*(SCI)\s+([^\s,;]+)/i);

  return sci ? `${sci[1]} ${sci[2]}` : (nom?.trim() ?? '');
}

/**
 * « jean-pierre DUPONT » -> « Jean-Pierre Dupont ». Les saisies mélangent
 * capitales et minuscules ; les courriers veulent une initiale par mot, en
 * traitant les composés (tiret, apostrophe) comme autant de mots.
 */
export function capitaliser(texte?: string | null): string {
  return (
    texte?.replace(
      /[^\s\-']+/g,
      (mot) => mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase(),
    ) ?? ''
  );
}
