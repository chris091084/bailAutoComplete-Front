import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import { ResultForm } from '../model/resultForm.model';
import { AppartementDto } from '../model/AppartementDto.model';
import * as saveAs from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class DocGeneratorService {
  constructor(private http: HttpClient) {}

  generateDoc(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto
  ): any {
    this.http
      .get('assets/docx/bail.docx', { responseType: 'arraybuffer' })
      .subscribe((data) => {
        const content = new Uint8Array(data);
        const zip = new PizZip(content);
        console.log(resultForm.tIrl);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        doc.render({
          bailType: resultForm.bailType,
          bailleurName: resultForm.bailleur?.name,
          bailleurAdress: resultForm.bailleur?.adress,
          bailleurEmail: resultForm.bailleur?.email,
          bailleurTelephone: resultForm.bailleur?.telephone,
          locataireName: resultForm.name,
          locataireAdress: resultForm.adress,
          locataireEmail: resultForm.email,
          locataireTelephone: resultForm.telephone,
          adressLogement: resultForm.appartement.adress,
          constructionPeriod: appartementSelected?.constructionPeriod,
          isLogiaFillature:
            resultForm.appartement.name === 'Filature' ? ',logia' : '',
          appartementEnergieHeating: appartementSelected?.energieHeating,
          appartementEnergieWater: appartementSelected?.energieWater,
          appartementSuface: appartementSelected?.surface,
          caracteristiquesAppartement: appartementSelected?.caracteristiques,
          hasAccessToGarageAndPoubelle:
            resultForm.appartement?.name === 'Filature' ||
            resultForm.appartement?.name === 'Chateau Gaillard',
          dateFrom: resultForm?.getFormattedFromDate(),
          dateTo: resultForm?.getFormattedToDate(),
          isMobilite: resultForm?.bailType === 'Mobilité',
          isEtudiant: resultForm?.bailType === 'Etudiant',
          isIndetermine: resultForm?.bailType === 'Indéterminé',
          hasMobiliteAndEtudiant:
            resultForm?.bailType === 'Mobilité' ||
            resultForm?.bailType === 'Etudiant',
          priceNoCharge: resultForm.priceNoCharge,
          appartementRentRef: (
            ((resultForm.rentRef ?? 0) * (appartementSelected?.surface ?? 0)) /
            4
          ).toFixed(2),
          appartementRentRefMaj: (
            ((resultForm.rentRefMaj ?? 0) *
              (appartementSelected?.surface ?? 0)) /
            4
          ).toFixed(2),
          rentRef: (
            resultForm.priceNoCharge - resultForm.appartement.rentRefMaj
          ).toFixed(2),
          rentRefMaj: (
            resultForm.priceNoCharge - resultForm.appartement.rentRefMaj
          ).toFixed(2),
          isFilature: resultForm.appartement?.name === 'Filature',
          isChateauGaillard:
            resultForm.appartement?.name === 'Chateau Gaillard',
          isRueRene: resultForm.appartement?.name === 'Rue René',
          rentWithoutCharge: resultForm.priceNoCharge,
          tIrl: resultForm.tIrl,
          valIrl: resultForm.valIrl,
          chargePrice: resultForm.chargePrice,
          rentPrice: resultForm.priceNoCharge,
          proportionalRent: (
            (resultForm.priceNoCharge * this.dateLeft(resultForm.from)) /
            this.numberOfDays(
              resultForm.from.getMonth() + 1,
              resultForm.from.getFullYear()
            )
          ).toFixed(2),
          howDayOfMonth: this.numberOfDays(
            resultForm.from.getMonth() + 1,
            resultForm.from.getFullYear()
          ),
          dayLeft: this.dateLeft(resultForm.from),
          chargePriceLeft: (
            (resultForm.chargePrice * this.dateLeft(resultForm.from)) /
            this.numberOfDays(
              resultForm.from.getMonth() + 1,
              resultForm.from.getFullYear()
            )
          ).toFixed(2),
          totalRentProMonth: resultForm.priceNoCharge + resultForm.chargePrice,
          totalMontNotCompletRent: (
            ((resultForm.priceNoCharge + resultForm.chargePrice) *
              this.dateLeft(resultForm.from)) /
            this.numberOfDays(
              resultForm.from.getMonth() + 1,
              resultForm.from.getFullYear()
            )
          ).toFixed(2),
          totalMontCompletRent:
            resultForm.priceNoCharge + resultForm.chargePrice,
          garantiePrice: resultForm.priceNoCharge * 2,
          isClauseLess6Month: resultForm.clauseLess6Month === true,
          petRule: resultForm.appartement.petRule,
          dateNow: this.dateNow(),

          typeResidence: resultForm.typeResidence,
          isResidencePrincipal: resultForm.typeResidence === 'Principale',
          isResidenceSecondaire: resultForm.typeResidence === 'Secondaire',
          room: resultForm.room,
          rentComp: (
            (resultForm.priceNoCharge ?? 0) -
            ((resultForm.rentRefMaj ?? 0) *
              (appartementSelected?.surface ?? 0)) /
              4
          ).toFixed(2),
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'Projet_bail_' + resultForm.name + '.docx');
      });

    const appartementName = appartementSelected?.name.replace(' ', '_');
    const chambreNumber = resultForm.room?.split(' ')[1];

    this.http
      .get(
        'assets/docx/doc-annexe/' + appartementName + chambreNumber + '.docx',
        {
          responseType: 'arraybuffer',
        }
      )
      .subscribe((data) => {
        const content = new Uint8Array(data); // Convertir ArrayBuffer en Uint8Array
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        doc.render({
          locataireName: resultForm.name,
          locataireAdress: resultForm.adress,
          locataireEmail: resultForm.email,
          locataireTelephone: resultForm.telephone,
          adressLogement: resultForm.appartement.adress,
          dateFrom: resultForm?.getFormattedFromDate(),
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'Annexe_1_Etat_des_lieux_' + resultForm.name + '.docx');
      });
  }

  private dateLeft(dateInput: Date) {
    let result: number = 0;
    const date: Date = new Date(dateInput);
    const mois: number = date.getMonth();
    const annee: number = date.getFullYear();

    const dernierJour: number = new Date(annee, mois + 1, 0).getDate();
    console.log('dernierJour', dernierJour - date.getDate());
    result = dernierJour - date.getDate();
    if (dernierJour - date.getDate() == 0) {
      result = 1;
    }

    return result;
  }

  private numberOfDays(mois: number, year: number): number {
    return new Date(year, mois, 0).getDate();
  }

  private dateNow(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
