import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Observable, map } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import {
  codePostalVilleDepuisAdresse,
  rueDepuisAdresse,
  villeDepuisAdresse,
} from './adresse.util';

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

@Injectable({
  providedIn: 'root',
})
export class QuittanceService {
  constructor(private http: HttpClient) {}

  /**
   * Produit la quittance de loyer d'un locataire pour la période choisie.
   *
   * Les montants ne sont pas demandés : ils viennent du bail signé
   * (`result_form.price_no_charge` et `charge_price`), que l'API expose sur le
   * locataire.
   */
  genererQuittance(
    locataire: LocataireDto,
    appartement: AppartementDto,
    options: QuittanceOptions,
  ): Observable<Blob> {
    return this.http
      .get(TEMPLATE_URL, { responseType: 'arraybuffer' })
      .pipe(
        map((data) =>
          this.remplirModele(data, locataire, appartement, options),
        ),
      );
  }

  nomFichier(locataire: LocataireDto, options: QuittanceOptions): string {
    const periode =
      options.moisDebut === options.moisFin
        ? options.moisDebut
        : `${options.moisDebut}_${options.moisFin}`;

    return `Quittance_${periode}_${locataire.nom}_${locataire.prenom}.docx`;
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
    const zip = new PizZip(new Uint8Array(data));
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
      nom_bailleur: appartement.bailleur?.name ?? '',
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

  private libelleMois(mois: string): string {
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
