import {
  controlerBalisesVides,
  controlerChampsBail,
} from './controle-bail.util';

/** Un jeu de champs complet et sain, dont chaque test ne dérange qu'une pièce. */
function champsValides(): Record<string, unknown> {
  return {
    bailType: 'Mobilité',
    bailleurName: 'S. BODIN',
    bailleurAdress: '12 rue des Lilas, 38121 CHONAS',
    locataireName: 'Jean Dupont',
    locataireAdress: '3 rue de la Paix, 69000 LYON',
    locataireEmail: 'jean.dupont@example.com',
    adressLogement: '5 rue de la Filature, 69100 VILLEURBANNE',
    room: 'Chambre 2',
    typeResidence: 'Principale',
    dateFrom: '01/09/2026',
    dateTo: '31/08/2027',
    appartementSuface: 42,
    tIrl: 'T2 2026',
    valIrl: '145,17',
    priceNoCharge: 550,
    rentPrice: 550,
    garantiePrice: 1100,
    totalRentProMonth: 610,
    appartementRentRef: '138.60',
    appartementRentRefMaj: '166.32',
    proportionalRent: '550.00',
    isIndetermine: false,
  };
}

describe('controlerChampsBail', () => {
  it('ne relève rien sur un bail complet', () => {
    expect(controlerChampsBail(champsValides())).toEqual([]);
  });

  it('signale un calcul raté sorti en « NaN »', () => {
    // Ce que produit `(undefined * 2).toFixed(2)` dans `champsBail()`.
    const champs = { ...champsValides(), proportionalRent: 'NaN' };

    expect(controlerChampsBail(champs)).toContain(
      "Loyer du premier mois, au prorata n'a pas pu être calculé (« NaN » dans le document).",
    );
  });

  it('signale un nombre non fini', () => {
    const champs = { ...champsValides(), garantiePrice: Number.NaN };

    expect(controlerChampsBail(champs)).toContain(
      "Dépôt de garantie n'a pas pu être calculé (« NaN » dans le document).",
    );
  });

  it('signale un champ obligatoire vide', () => {
    const champs = { ...champsValides(), locataireAdress: '   ' };

    expect(controlerChampsBail(champs)).toContain(
      'Champ non renseigné : Adresse du locataire.',
    );
  });

  it('réclame la date de fin sur un bail à durée déterminée', () => {
    const champs = { ...champsValides(), dateTo: null };

    expect(controlerChampsBail(champs)).toContain(
      'Champ non renseigné : Date de fin.',
    );
  });

  it('ne réclame pas de date de fin sur un bail à durée indéterminée', () => {
    const champs = {
      ...champsValides(),
      dateTo: null,
      isIndetermine: true,
    };

    expect(controlerChampsBail(champs)).toEqual([]);
  });

  it('met en doute un montant à zéro sans le confondre avec une erreur', () => {
    const champs = { ...champsValides(), priceNoCharge: 0 };
    const anomalies = controlerChampsBail(champs);

    expect(anomalies).toContain('Loyer hors charges vaut 0 € : à vérifier.');
    // Un zéro n'est pas un calcul raté : il ne doit pas être compté deux fois.
    expect(anomalies.length).toBe(1);
  });

  it('classe les calculs ratés avant les champs vides', () => {
    const champs = {
      ...champsValides(),
      proportionalRent: 'NaN',
      bailleurName: '',
    };
    const anomalies = controlerChampsBail(champs);

    expect(anomalies[0]).toContain('NaN');
    expect(anomalies[1]).toContain('Nom du bailleur');
  });
});

describe('controlerBalisesVides', () => {
  it('ne dit rien quand le modèle est entièrement nourri', () => {
    expect(controlerBalisesVides([])).toEqual([]);
  });

  it('nomme la balise restée vide', () => {
    expect(controlerBalisesVides(['loyerAnnuel'])).toEqual([
      'La balise « loyerAnnuel » du modèle Word est restée vide : le document a un blanc à cet endroit.',
    ]);
  });

  it('les regroupe en une phrase au-delà d’une', () => {
    const [message] = controlerBalisesVides(['loyerAnnuel', 'dateVisite']);

    expect(message).toContain('2 balises');
    expect(message).toContain('« loyerAnnuel », « dateVisite »');
  });
});
