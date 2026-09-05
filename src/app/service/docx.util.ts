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

/** Un document rempli, avec ce que le remplissage a révélé du modèle. */
export interface DocumentRempli {
  fichier: Blob;
  /**
   * Balises présentes dans le modèle Word mais absentes des champs fournis.
   * Une seule y suffit à trahir un modèle retouché sans que le code suive.
   */
  balisesVides: string[];
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
  const { fichier } = await remplirModeleDocxControle(modele, champs);
  return fichier;
}

/**
 * Même remplissage, mais en relevant au passage les balises que les champs
 * n'ont pas su nourrir.
 *
 * Sans `nullGetter`, docxtemplater écrit « undefined » dans le document pour
 * une balise sans champ : le bail part avec le mot en toutes lettres au milieu
 * d'un paragraphe. On renvoie une chaîne vide à la place et on note la balise,
 * pour la signaler à la relecture.
 */
export async function remplirModeleDocxControle(
  modele: ArrayBuffer,
  champs: Record<string, unknown>,
): Promise<DocumentRempli> {
  const { Docxtemplater, PizZip } = await chargerDocx();
  const balisesVides = new Set<string>();

  const doc = new Docxtemplater(new PizZip(new Uint8Array(modele)), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part: { value?: string; module?: string }) => {
      // Les sections et boucles non satisfaites sont le fonctionnement normal
      // d'un modèle à variantes (bail mobilité, étudiant, indéterminé) : seules
      // les balises simples manquantes sont des anomalies.
      if (!part?.module && part?.value) {
        balisesVides.add(part.value);
      }
      return '';
    },
  });
  doc.render(champs);

  return {
    fichier: doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME }),
    balisesVides: [...balisesVides],
  };
}
