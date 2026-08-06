import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Observable, firstValueFrom, from, switchMap } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import {
  codePostalVilleDepuisAdresse,
  nomBailleur,
  rueDepuisAdresse,
  villeDepuisAdresse,
} from './adresse.util';
import { RequestService } from './requestService';

const TEMPLATE_URL = 'assets/docx/Quittance_de_loyer.docx';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
  constructor(
    private http: HttpClient,
    private requestService: RequestService,
  ) {}

  /**
   * Produit les quittances de loyer d'un locataire sur la période choisie, à
   * raison d'une par mois : une quittance atteste du paiement d'un loyer, et le
   * loyer est mensuel. Une période de janvier à avril donne donc quatre
   * documents, du 01/01 au 31/01, du 01/02 au 28/02, etc.
   *
   * Le modèle Word n'est téléchargé qu'une fois, puis rempli autant de fois
   * qu'il y a de mois. Chaque document rempli part ensuite à l'API, qui le
   * convertit en PDF avec LibreOffice : le locataire reçoit un PDF, et le
   * bailleur garde la main sur la mise en page en modifiant le `.docx`.
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
    return this.http.get(TEMPLATE_URL, { responseType: 'arraybuffer' }).pipe(
      switchMap((data) => {
        const quittances = this.moisDeLaPeriode(options).map((mois) => ({
          mois,
          libelle: this.libelleMois(mois),
          nomFichier: this.nomFichier(locataire, mois),
          // Chaque document ne couvre que son propre mois : la période du
          // formulaire n'est qu'un raccourci de saisie.
          docx: this.remplirModele(data, locataire, appartement, {
            ...options,
            moisDebut: mois,
            moisFin: mois,
          }),
        }));

        return from(this.convertirEnPdf(quittances));
      }),
    );
  }

  /**
   * Convertit les documents remplis un par un, et non en parallèle : chaque
   * conversion réveille un LibreOffice sur l'API, qui tourne avec peu de
   * mémoire. Quatre conversions simultanées la satureraient.
   */
  private async convertirEnPdf(
    quittances: { mois: string; libelle: string; nomFichier: string; docx: Blob }[],
  ): Promise<QuittanceGeneree[]> {
    const converties: QuittanceGeneree[] = [];

    for (const { mois, libelle, nomFichier, docx } of quittances) {
      converties.push({
        mois,
        libelle,
        nomFichier,
        fichier: await firstValueFrom(
          this.requestService.convertirEnPdf(docx, nomFichier),
        ),
      });
    }

    return converties;
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

  private remplirModele(
    data: ArrayBuffer,
    locataire: LocataireDto,
    appartement: AppartementDto,
    options: QuittanceOptions,
  ): Blob {
    // `slice()` copie le modèle : le même ArrayBuffer sert à remplir toutes les
    // quittances de la période, et PizZip ne doit pas travailler dessus en
    // place au risque d'abîmer les documents suivants.
    const zip = new PizZip(new Uint8Array(data.slice(0)));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const adresseLogement = appartement.adress;
    const adresseBailleur = appartement.bailleur?.adress;
    const loyerHorsCharges = locataire.loyerHorsCharges ?? 0;
    const charges = locataire.charges ?? 0;

    doc.render({
      date_from: this.debutPeriode(options.moisDebut),
      date_to: this.finPeriode(options.moisFin),
      // Le bailleur n'est saisi que par un nom complet : il alimente le nom, et
      // le prénom du modèle reste vide plutôt que d'être découpé au hasard.
      nom_bailleur: nomBailleur(appartement.bailleur?.name),
      prenom_bailleur: '',
      adresse_bailleur: rueDepuisAdresse(adresseBailleur),
      cp_ville_bailleur: codePostalVilleDepuisAdresse(adresseBailleur),
      nom_locataire: locataire.nom,
      prenom_locataire: locataire.prenom,
      // Le locataire est domicilié dans le logement loué : l'en-tête et le bloc
      // « adresse de la location » portent donc la même adresse.
      adresse_locataire: rueDepuisAdresse(adresseLogement),
      cp_ville_locataire: codePostalVilleDepuisAdresse(adresseLogement),
      cp_ville_location: codePostalVilleDepuisAdresse(adresseLogement),
      ville_signature: villeDepuisAdresse(adresseBailleur),
      date_now: this.formaterDate(new Date()),
      date_paiement: this.formaterDate(options.datePaiement),
      price_no_charge: this.montant(loyerHorsCharges),
      charge_price: this.montant(charges),
      total_price: this.montant(loyerHorsCharges + charges),
    });

    return doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME });
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
