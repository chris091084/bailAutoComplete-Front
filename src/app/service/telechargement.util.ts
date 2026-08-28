/**
 * Déclenche le téléchargement d'un fichier produit dans le navigateur.
 *
 * Remplace `file-saver` : la bibliothèque est en CommonJS, ce qui coûtait un
 * abandon d'optimisation au build, pour un service que `<a download>` rend
 * aujourd'hui en quelques lignes sur tous les navigateurs visés.
 */
export function telechargerFichier(fichier: Blob, nomFichier: string): void {
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement('a');

  lien.href = url;
  lien.download = nomFichier;
  lien.rel = 'noopener';
  document.body.appendChild(lien);
  lien.click();
  lien.remove();

  // L'URL est révoquée après coup : la révoquer dans la foulée du clic
  // annulerait le téléchargement encore en train de démarrer.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
