import { nomBailleur } from './adresse.util';

describe('nomBailleur', () => {
  it('réduit une SCI à sa dénomination', () => {
    expect(
      nomBailleur(
        "SCI BZHRO, Société civile immobilière au capital de 1000 €, dont le " +
          "siège est à CHONAS-L'AMBALLAN (38121), 140 impasse le Clos du Buis, " +
          'identifiée au SIREN sous le numéro 993376151 et immatriculée au ' +
          'Registre du Commerce et des Sociétés de VIENNE',
      ),
    ).toBe('SCI BZHRO');
  });

  it('accepte une SCI saisie sans mention légale', () => {
    expect(nomBailleur('SCI BZHRO')).toBe('SCI BZHRO');
  });

  it('reprend tel quel le nom d’un bailleur particulier', () => {
    expect(nomBailleur('S. BODIN')).toBe('S. BODIN');
  });

  it('rend une chaîne vide sans bailleur', () => {
    expect(nomBailleur(undefined)).toBe('');
    expect(nomBailleur(null)).toBe('');
  });
});
