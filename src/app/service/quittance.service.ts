/**
 * ATTENTION — la mise en page de la quittance vit ici, dans `definitionDocument`,
 * et non dans `assets/docx/Quittance_de_loyer.docx`.
 *
 * Ce modèle Word reste celui que le bailleur retouche de temps en temps, mais
 * il n'est plus lu par le code : il ne sert qu'à dire à quoi la quittance doit
 * ressembler. Un modèle modifié ne change donc rien au PDF produit tant que
 * cette classe n'est pas mise à jour en conséquence — les deux peuvent diverger
 * sans que rien ne le signale.
 *
 * Marche à suivre quand le bailleur renvoie un modèle retouché :
 *   1. déposer le nouveau `.docx` dans `assets/docx/` (il fait foi visuellement) ;
 *   2. le convertir pour le voir : `soffice --headless --convert-to pdf <fichier>` ;
 *   3. reporter les écarts dans `definitionDocument` ci-dessous.
 *
 * Ce fonctionnement est un choix assumé : il évite d'installer LibreOffice sur
 * l'API pour convertir les documents à la volée.
 */
import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type {
  Content,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { Observable, from } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import {
  codePostalVilleDepuisAdresse,
  rueDepuisAdresse,
  villeDepuisAdresse,
} from './adresse.util';
import {
  SIGNATURE_BAILLEUR,
  SIGNATURE_HAUTEUR,
  SIGNATURE_LARGEUR,
} from './quittance-signature';

// Polices embarquées de pdfmake (Roboto). Sans ce branchement, `createPdf`
// échoue à la première génération faute de trouver ses fichiers de police.
pdfMake.addVirtualFileSystem(pdfFonts);

/**
 * Reprises du modèle Word d'origine, en points PDF : A4, marges de 2,5 cm,
 * colonnes du tableau des montants. Le document tient sur une page.
 */
const MARGE_PAGE = 71;
const GRIS_ENTETE = '#bfbfbf';

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Ce que la modale de quittance recueille. La période est bornée au mois : une
 * quittance couvre des mois entiers, jamais un bout de mois, d'où les deux
 * « AAAA-MM » plutôt que deux dates.
 */
export interface QuittanceOptions {
  /** Premier mois couvert, au format « AAAA-MM ». */
  moisDebut: string;
  /** Dernier mois couvert, au format « AAAA-MM » ; égal à `moisDebut` pour un
   * mois isolé. */
  moisFin: string;
  /** Date à laquelle le loyer a été réglé, au format « AAAA-MM-JJ ». */
  datePaiement: string;
}

/** Une quittance produite, prête à être téléchargée ou mise en pièce jointe. */
export interface QuittanceGeneree {
  /** Mois couvert, « AAAA-MM ». */
  mois: string;
  /** « janvier 2026 », pour les messages à l'écran et le corps du mail. */
  libelle: string;
  nomFichier: string;
  fichier: Blob;
}

@Injectable({
  providedIn: 'root',
})
export class QuittanceService {
  /**
   * Produit les quittances de loyer d'un locataire sur la période choisie, à
   * raison d'une par mois : une quittance atteste du paiement d'un loyer, et le
   * loyer est mensuel. Une période de janvier à avril donne donc quatre PDF,
   * du 01/01 au 31/01, du 01/02 au 28/02, etc.
   *
   * Le PDF est dessiné dans le navigateur, sans passer par l'API : la mise en
   * page reprend celle du modèle Word d'origine.
   *
   * Les montants ne sont pas demandés : ils viennent du bail signé
   * (`result_form.price_no_charge` et `charge_price`), que l'API expose sur le
   * locataire.
   */
  genererQuittances(
    locataire: LocataireDto,
    appartement: AppartementDto,
    options: QuittanceOptions,
  ): Observable<QuittanceGeneree[]> {
    const quittances = this.moisDeLaPeriode(options).map(async (mois) => ({
      mois,
      libelle: this.libelleMois(mois),
      nomFichier: this.nomFichier(locataire, mois),
      // Chaque document ne couvre que son propre mois : la période du
      // formulaire n'est qu'un raccourci de saisie.
      fichier: await this.construirePdf(locataire, appartement, {
        ...options,
        moisDebut: mois,
        moisFin: mois,
      }),
    }));

    return from(Promise.all(quittances));
  }

  /**
   * Les mois couverts par la période, « AAAA-MM », bornes comprises. Le calcul
   * passe par un nombre de mois absolu (année × 12 + mois) plutôt que par une
   * date incrémentée, qui déborderait sur le mois suivant depuis un 31.
   */
  moisDeLaPeriode(options: QuittanceOptions): string[] {
    const [anneeDebut, moisDebut] = this.decouperMois(options.moisDebut);
    const [anneeFin, moisFin] = this.decouperMois(options.moisFin);

    const premier = anneeDebut * 12 + (moisDebut - 1);
    const dernier = anneeFin * 12 + (moisFin - 1);
    if (!Number.isFinite(premier) || !Number.isFinite(dernier)) {
      return [];
    }

    const mois: string[] = [];
    for (let curseur = premier; curseur <= dernier; curseur++) {
      const annee = Math.floor(curseur / 12);
      const moisSeul = (curseur % 12) + 1;
      mois.push(`${annee}-${String(moisSeul).padStart(2, '0')}`);
    }

    return mois;
  }

  /** Une quittance ne couvre qu'un mois : son nom le porte, « AAAA-MM ». */
  nomFichier(locataire: LocataireDto, mois: string): string {
    return `Quittance_${mois}_${locataire.nom}_${locataire.prenom}.pdf`;
  }

  /** « janvier 2026 », ou « janvier 2026 à mars 2026 » sur plusieurs mois. */
  libellePeriode(options: QuittanceOptions): string {
    const debut = this.libelleMois(options.moisDebut);

    return options.moisDebut === options.moisFin
      ? debut
      : `${debut} à ${this.libelleMois(options.moisFin)}`;
  }

  /** Premier jour du mois de début, « JJ/MM/AAAA ». */
  debutPeriode(moisDebut: string): string {
    const [annee, mois] = this.decouperMois(moisDebut);
    return `01/${String(mois).padStart(2, '0')}/${annee}`;
  }

  /**
   * Dernier jour du mois de fin, « JJ/MM/AAAA ». Le jour 0 du mois suivant est
   * le dernier du mois demandé, ce qui règle février et les années bissextiles
   * sans table de correspondance.
   */
  finPeriode(moisFin: string): string {
    const [annee, mois] = this.decouperMois(moisFin);
    const dernierJour = new Date(annee, mois, 0).getDate();
    return `${dernierJour}/${String(mois).padStart(2, '0')}/${annee}`;
  }

  /** pdfmake assemble le document et ses polices de façon asynchrone. */
  private construirePdf(
    locataire: LocataireDto,
    appartement: AppartementDto,
    options: QuittanceOptions,
  ): Promise<Blob> {
    return pdfMake
      .createPdf(this.definitionDocument(locataire, appartement, options))
      .getBlob();
  }

  /**
   * Mise en page de la quittance, reprise du modèle Word : titre, période,
   * bailleur et locataire côte à côte, adresse de la location encadrée,
   * tableau des montants, puis paiement et signature.
   */
  private definitionDocument(
    locataire: LocataireDto,
    appartement: AppartementDto,
    options: QuittanceOptions,
  ): TDocumentDefinitions {
    const adresseLogement = appartement.adress;
    const adresseBailleur = appartement.bailleur?.adress;
    const loyerHorsCharges = locataire.loyerHorsCharges ?? 0;
    const charges = locataire.charges ?? 0;
    // Le locataire est domicilié dans le logement loué : l'en-tête et le bloc
    // « adresse de la location » portent donc la même adresse.
    const rueLogement = rueDepuisAdresse(adresseLogement);
    const villeLogement = codePostalVilleDepuisAdresse(adresseLogement);

    return {
      pageSize: 'A4',
      pageMargins: [MARGE_PAGE, MARGE_PAGE, MARGE_PAGE, MARGE_PAGE],
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      content: [
        { text: 'QUITTANCE DE LOYER', fontSize: 20, alignment: 'center' },
        {
          text: `Période du ${this.debutPeriode(options.moisDebut)} au ${this.finPeriode(options.moisFin)}`,
          fontSize: 12,
          alignment: 'center',
          margin: [0, 6, 0, 30],
        },
        {
          columns: [
            this.blocAdresse('Bailleur', [
              // Le bailleur n'est saisi que par un nom complet : pas de découpage
              // nom/prénom au hasard.
              appartement.bailleur?.name ?? '',
              rueDepuisAdresse(adresseBailleur),
              codePostalVilleDepuisAdresse(adresseBailleur),
            ]),
            this.blocAdresse('Locataire', [
              `${locataire.nom} ${locataire.prenom}`,
              rueLogement,
              villeLogement,
            ]),
          ],
          columnGap: 20,
        },
        {
          text: `Fait à ${villeDepuisAdresse(adresseBailleur)}, le ${this.formaterDate(new Date())}`,
          alignment: 'right',
          margin: [0, 24, 0, 20],
        },
        {
          // Encadré : une seule cellule, comme la bordure de paragraphe du
          // modèle Word.
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: 'Adresse de la location :', bold: true },
                    { text: rueLogement, margin: [0, 8, 0, 0] },
                    { text: villeLogement },
                  ],
                  margin: [4, 6, 4, 6],
                },
              ],
            ],
          },
          margin: [0, 0, 0, 28],
        },
        {
          table: {
            widths: ['*', 130],
            body: [
              [
                { text: 'LIBELLE', bold: true, fillColor: GRIS_ENTETE },
                {
                  text: 'MONTANT',
                  bold: true,
                  alignment: 'center',
                  fillColor: GRIS_ENTETE,
                },
              ],
              this.ligneMontant('Loyer Hors charges', loyerHorsCharges),
              this.ligneMontant('Forfait Charges', charges),
              this.ligneMontant('TOTAL', loyerHorsCharges + charges),
            ],
          },
          margin: [0, 0, 0, 24],
        },
        {
          text: `Date de paiement : ${this.formaterDate(options.datePaiement)}`,
        },
        { text: 'Mode de paiement : Virement bancaire' },
        {
          text: 'S. BODIN',
          alignment: 'right',
          margin: [0, 30, 0, 4],
        },
        {
          image: SIGNATURE_BAILLEUR,
          width: SIGNATURE_LARGEUR,
          height: SIGNATURE_HAUTEUR,
          alignment: 'right',
        },
      ],
    };
  }

  /** « Bailleur » ou « Locataire » en gras, puis les lignes d'adresse. */
  private blocAdresse(titre: string, lignes: string[]): Content {
    return {
      stack: [
        { text: titre, bold: true, margin: [0, 0, 0, 12] },
        ...lignes.map(
          (ligne): Content => ({ text: ligne, margin: [0, 0, 0, 4] }),
        ),
      ],
    };
  }

  private ligneMontant(libelle: string, valeur: number): Content[] {
    return [
      { text: libelle, margin: [0, 4, 0, 4] },
      {
        text: `${this.montant(valeur)} €`,
        alignment: 'center',
        margin: [0, 4, 0, 4],
      },
    ];
  }

  /** « AAAA-MM » -> [2026, 1]. */
  private decouperMois(mois: string): [number, number] {
    const [annee, moisSeul] = mois.split('-');
    return [Number(annee), Number(moisSeul)];
  }

  /** « AAAA-MM » -> « janvier 2026 ». */
  libelleMois(mois: string): string {
    const [annee, moisSeul] = this.decouperMois(mois);
    return `${MOIS[moisSeul - 1] ?? mois} ${annee}`;
  }

  /**
   * Les dates du formulaire sont des chaînes « AAAA-MM-JJ » : on les découpe
   * telles quelles plutôt que de passer par `new Date()`, qui les interpréterait
   * en UTC et reculerait d'un jour à l'ouest de Greenwich.
   */
  private formaterDate(date: string | Date): string {
    if (typeof date === 'string') {
      const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : date;
    }

    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    return `${jour}/${mois}/${date.getFullYear()}`;
  }

  /**
   * 550 -> « 550 ». Les loyers sont des montants ronds : pas de décimales
   * inutiles sur la quittance. Le modèle porte déjà le « € ».
   *
   * Les centimes ne s'écrivent que s'il y en a — un loyer à 550,50 € ne doit pas
   * s'arrondir — et prennent alors la virgule décimale française.
   */
  private montant(valeur: number): string {
    const montant = Number.isFinite(valeur) ? valeur : 0;

    return Number.isInteger(montant)
      ? String(montant)
      : montant.toFixed(2).replace('.', ',');
  }
}
