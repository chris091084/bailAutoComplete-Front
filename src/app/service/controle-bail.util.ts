/**
 * Contrôle du bail produit, avant qu'il ne parte par mail.
 *
 * Un mail ne se rattrape pas, et les défauts d'un bail généré sont discrets :
 * un « NaN » au milieu d'un montant, une adresse vide, une balise oubliée en
 * page 4 d'un modèle Word retouché. La relecture à l'écran les manque une fois
 * sur deux ; cette liste les nomme.
 *
 * Rien n'est bloqué ici : les anomalies s'affichent, l'utilisateur décide. Un
 * bail à 0 € de charges est parfaitement légitime, seul le bailleur sait si
 * c'est le cas.
 */

/**
 * Les champs du modèle Word, sous le nom qu'ils portent à l'écran. Distincte de
 * la table du formulaire (qui, elle, désigne des contrôles de saisie) : le
 * modèle a ses propres balises, `champsBail()` les compose à partir de
 * plusieurs contrôles.
 */
const LIBELLES_CHAMPS_BAIL: Record<string, string> = {
  bailType: 'Type de bail',
  bailleurName: 'Nom du bailleur',
  bailleurAdress: 'Adresse du bailleur',
  locataireName: 'Nom du locataire',
  locataireAdress: 'Adresse du locataire',
  locataireEmail: 'Email du locataire',
  adressLogement: 'Adresse du logement',
  room: 'Chambre',
  typeResidence: 'Type de résidence',
  dateFrom: 'Date de début',
  dateTo: 'Date de fin',
  appartementSuface: 'Surface du logement',
  etage: 'Étage',
  tIrl: "Trimestre de l'IRL",
  valIrl: "Valeur de l'IRL",
  priceNoCharge: 'Loyer hors charges',
  rentPrice: 'Loyer hors charges',
  rentWithoutCharge: 'Loyer hors charges',
  chargePrice: 'Montant des charges',
  garantiePrice: 'Dépôt de garantie',
  totalRentProMonth: 'Loyer mensuel total',
  totalMontCompletRent: 'Loyer mensuel total',
  lastPriceWithoutCharge: 'Loyer du dernier locataire',
  appartementRentRef: 'Loyer de référence',
  appartementRentRefMaj: 'Loyer de référence majoré',
  rentRef: 'Écart au loyer de référence',
  rentRefMaj: 'Écart au loyer de référence majoré',
  rentComp: 'Complément de loyer',
  proportionalRent: 'Loyer du premier mois, au prorata',
  chargePriceLeft: 'Charges du premier mois, au prorata',
  totalMontNotCompletRent: 'Total du premier mois, au prorata',
  dayLeft: 'Nombre de jours du premier mois',
  howDayOfMonth: 'Nombre de jours dans le mois',
  petRule: 'Clause sur les animaux',
  constructionPeriod: 'Période de construction',
  appartementEnergieHeating: 'Énergie de chauffage',
  appartementEnergieWater: "Énergie de l'eau chaude",
};

/** Sans eux, le bail n'est pas un contrat : ils doivent être remplis. */
const CHAMPS_OBLIGATOIRES = [
  'bailType',
  'bailleurName',
  'bailleurAdress',
  'locataireName',
  'locataireAdress',
  'locataireEmail',
  'adressLogement',
  'room',
  'typeResidence',
  'dateFrom',
  'appartementSuface',
  'tIrl',
  'valIrl',
];

/**
 * Les montants. Un zéro y est suspect sans être fautif : le loyer de référence
 * peut manquer dans une commune non encadrée, mais un loyer à 0 € trahit
 * presque toujours une saisie perdue en route.
 */
const CHAMPS_MONTANT = [
  'priceNoCharge',
  'rentPrice',
  'garantiePrice',
  'totalRentProMonth',
  'appartementRentRef',
  'appartementRentRefMaj',
  'proportionalRent',
];

/** Le nom d'écran de la balise, à défaut la balise elle-même. */
function libelle(champ: string): string {
  return LIBELLES_CHAMPS_BAIL[champ] ?? champ;
}

/**
 * Un calcul raté ne lève pas : il s'écrit. `champsBail()` enchaîne les
 * `.toFixed(2)` sur des valeurs optionnelles, et `(undefined * 2).toFixed(2)`
 * rend la chaîne « NaN », qui part telle quelle dans le document.
 */
function estCalculRate(valeur: unknown): boolean {
  if (typeof valeur === 'number') {
    return !Number.isFinite(valeur);
  }

  return (
    typeof valeur === 'string' &&
    /\b(NaN|undefined|Infinity)\b/.test(valeur)
  );
}

function estVide(valeur: unknown): boolean {
  return (
    valeur === null ||
    valeur === undefined ||
    (typeof valeur === 'string' && valeur.trim() === '') ||
    (Array.isArray(valeur) && valeur.length === 0)
  );
}

/**
 * Relève ce qui cloche dans les champs destinés au modèle, avant remplissage.
 *
 * L'ordre suit la gravité : un calcul raté écrit « NaN » dans le contrat, un
 * champ vide laisse un blanc, un zéro n'est qu'un doute.
 */
export function controlerChampsBail(champs: Record<string, unknown>): string[] {
  const calculsRates: string[] = [];
  const manquants: string[] = [];
  const zeros: string[] = [];

  // Le balayage porte sur tout ce qui est fourni au modèle, et pas seulement
  // sur les champs listés : un « NaN » est une anomalie où qu'il apparaisse.
  for (const [champ, valeur] of Object.entries(champs)) {
    if (estCalculRate(valeur)) {
      calculsRates.push(
        `${libelle(champ)} n'a pas pu être calculé (« NaN » dans le document).`,
      );
    }
  }

  // Tournure sans accord (« Champ non renseigné : … ») plutôt que « n'est pas
  // renseigné » : les libellés mêlent masculin et féminin, et « Adresse du
  // locataire n'est pas renseigné » se lit comme une faute.
  for (const champ of CHAMPS_OBLIGATOIRES) {
    if (estVide(champs[champ])) {
      manquants.push(`Champ non renseigné : ${libelle(champ)}.`);
    }
  }

  // Un bail à durée indéterminée n'a pas de date de fin : ne pas la réclamer.
  if (champs['isIndetermine'] !== true && estVide(champs['dateTo'])) {
    manquants.push(`Champ non renseigné : ${libelle('dateTo')}.`);
  }

  for (const champ of CHAMPS_MONTANT) {
    const valeur = champs[champ];
    if (estCalculRate(valeur)) {
      // Déjà signalé plus haut, au titre du calcul raté.
      continue;
    }

    if (Number(valeur) === 0) {
      zeros.push(`${libelle(champ)} vaut 0 € : à vérifier.`);
    }
  }

  return [...calculsRates, ...manquants, ...zeros];
}

/**
 * Met en phrase les balises que le modèle porte sans que le code les nourrisse.
 * Le cas type : le modèle Word a été retouché et une balise y a été ajoutée ou
 * mal orthographiée.
 */
export function controlerBalisesVides(balises: string[]): string[] {
  if (balises.length === 0) {
    return [];
  }

  const noms = balises.map((balise) => `« ${balise} »`).join(', ');

  return balises.length === 1
    ? [`La balise ${noms} du modèle Word est restée vide : le document a un blanc à cet endroit.`]
    : [`${balises.length} balises du modèle Word sont restées vides (${noms}) : le document a des blancs à ces endroits.`];
}
