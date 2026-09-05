/**
 * Encode un fichier produit dans le navigateur pour l'API : `POST /mail/send`
 * transporte ses pièces jointes en base64 dans le JSON.
 *
 * `readAsDataURL` produit « data:<type>;base64,<contenu> » : seule la seconde
 * moitié part, le DTO côté API refuse le préfixe.
 */
export function enBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
