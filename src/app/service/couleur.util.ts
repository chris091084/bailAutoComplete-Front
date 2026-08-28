/**
 * Le noir ou le blanc, selon celui qui se lit le mieux sur la couleur donnée.
 *
 * Les couleurs de chambre sont libres : un texte de couleur fixe serait
 * illisible sur la moitié d'entre elles — noir sur un bleu nuit, blanc sur un
 * jaune pâle. Le départage suit la luminance relative définie par WCAG, dont
 * le seuil 0,179 sépare les fonds qui contrastent le mieux avec le noir de
 * ceux qui contrastent le mieux avec le blanc.
 *
 * Rend le noir sur une couleur absente ou non reconnue : c'est la valeur sûre
 * sur les fonds clairs, et un fond illisible vaut mieux qu'un texte invisible.
 */
export function couleurTexteSur(fond: string | null | undefined): string {
  const composantes = composantesRvb(fond);
  if (!composantes) {
    return '#000';
  }

  const [rouge, vert, bleu] = composantes.map(canalLineaire);
  const luminance = 0.2126 * rouge + 0.7152 * vert + 0.0722 * bleu;

  return luminance > 0.179 ? '#000' : '#fff';
}

/**
 * « #abc » et « #aabbcc » vers [170, 187, 204]. `null` sur tout le reste : la
 * couleur vient de la base, rien ne garantit qu'elle soit renseignée ni bien
 * formée.
 */
function composantesRvb(fond: string | null | undefined): number[] | null {
  const hexa = fond?.trim().replace(/^#/, '');
  if (!hexa) {
    return null;
  }

  const canaux =
    hexa.length === 3
      ? hexa.split('').map((canal) => canal + canal)
      : hexa.length === 6
        ? [hexa.slice(0, 2), hexa.slice(2, 4), hexa.slice(4, 6)]
        : null;

  if (!canaux || canaux.some((canal) => !/^[0-9a-f]{2}$/i.test(canal))) {
    return null;
  }

  return canaux.map((canal) => parseInt(canal, 16));
}

/** Le canal 0-255 ramené à l'échelle linéaire dans laquelle WCAG le pondère. */
function canalLineaire(valeur: number): number {
  const ratio = valeur / 255;

  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}
