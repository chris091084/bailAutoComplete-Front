import { couleurTexteSur } from './couleur.util';

describe('couleurTexteSur', () => {
  it('écrit en noir sur les couleurs claires', () => {
    expect(couleurTexteSur('#ffffff')).toBe('#000');
    expect(couleurTexteSur('#ffe066')).toBe('#000');
    // Forme courte : « #fc0 » vaut « #ffcc00 ».
    expect(couleurTexteSur('#fc0')).toBe('#000');
  });

  it('écrit en blanc sur les couleurs sombres', () => {
    expect(couleurTexteSur('#000000')).toBe('#fff');
    expect(couleurTexteSur('#1b3a6b')).toBe('#fff');
  });

  it('retombe sur le noir faute de couleur exploitable', () => {
    expect(couleurTexteSur(null)).toBe('#000');
    expect(couleurTexteSur(undefined)).toBe('#000');
    expect(couleurTexteSur('')).toBe('#000');
    expect(couleurTexteSur('bleu')).toBe('#000');
    expect(couleurTexteSur('#12345')).toBe('#000');
  });
});
