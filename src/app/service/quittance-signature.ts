/**
 * Signature du bailleur, telle qu'elle figurait dans le modèle Word des
 * quittances (`assets/docx/Quittance_de_loyer.docx`, image de 90 × 42 px).
 * Elle vit ici en base64 plutôt qu'en fichier d'`assets` : 446 octets ne
 * justifient pas un aller-retour réseau au moment de produire le PDF.
 */
export const SIGNATURE_BAILLEUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAAAqCAMAAAAEVLzxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURQAAAAAAAKVnuc8AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAATNJREFUSEvtkEESwzAIA5P/f7oGBAjsSSZJj95DjYTQtD3Of7Bs+Uv1sasby+5d3djVjV3d2NWN++rlWeNN9aFArEBglbmstruLauwFOIRYWCrmKpDVZDwv75QZvwQbwneYbpuX1cOQv4n9UP2dyUUcOWpMLi7cntYBLVqJyKGrKZgBv6zlIjRt2CZVXMUMuLLOYKBaXMWtNtMITJe9k04GBmO0pa7C1xDFXLIlDifEoIApB+ZAR/J0NMwQqhrw3iZ1WgiPbewBtlHaEeqUGmTS1zrP5aRURbrlCq0gk3xC9gApfQZwZ+oJlfCRbxK4lJkp1fYJK8+0g4B9R+biBgPrmJ/A1RgwWd3LWmFdHaWCmc9ZVWP81Du4rFbxGu7zGdO378zVUhVAq/8WvrbWLPzUfJ4/aOMMjLw3HuEAAAAASUVORK5CYII=';

/** Dimensions du modèle Word, en points PDF (0,93 × 0,43 pouce). */
export const SIGNATURE_LARGEUR = 67;
export const SIGNATURE_HAUTEUR = 31;
