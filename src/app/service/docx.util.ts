/**
 * Chargement à la demande de docxtemplater et PizZip.
 *
 * À eux deux, ils pèsent un tiers du bundle initial (~334 kB) pour un code qui
 * ne sert qu'au moment où l'utilisateur produit un document : bail, annexe,
 * quittance ou courrier de congé. Les importer statiquement les faisait entrer
 * dans le bundle de démarrage via les services `providedIn: 'root'` injectés
 * par les composants chargés d'emblée. L'import dynamique les repousse dans un
 * chunk séparé, téléchargé au premier document et réutilisé ensuite.
 */

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type ModuleDocx = {
  Docxtemplater: typeof import('docxtemplater').default;
  PizZip: typeof import('pizzip').default;
};

/**
 * Mémorise la promesse, pas le module : deux générations lancées coup sur coup
 * partagent alors le même téléchargement au lieu d'en déclencher deux.
 */
let moduleDocx: Promise<ModuleDocx> | null = null;

function chargerDocx(): Promise<ModuleDocx> {
  moduleDocx ??= Promise.all([import('docxtemplater'), import('pizzip')]).then(
    ([docxtemplater, pizzip]) => ({
      Docxtemplater: docxtemplater.default,
      PizZip: pizzip.default,
    }),
  );

  return moduleDocx;
}

/**
 * Remplit un modèle Word et renvoie le document produit.
 *
 * `render()` lève dès qu'une balise du modèle n'a pas son champ : l'exception
 * rejette la promesse, plutôt que de rester dans une souscription où personne
 * ne l'attendait.
 */
export async function remplirModeleDocx(
  modele: ArrayBuffer,
  champs: Record<string, unknown>,
): Promise<Blob> {
  const { Docxtemplater, PizZip } = await chargerDocx();

  const doc = new Docxtemplater(new PizZip(new Uint8Array(modele)), {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(champs);

  return doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME });
}
