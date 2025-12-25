import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { ResultForm } from '../model/resultForm.model';
import { AppartementDto } from '../model/AppartementDto.model';
import saveAs from 'file-saver';
import { AppartementNameEnum, BailTypeEnum } from '../model/enum.model';

import { Generation } from '../model/Generation.model';
import { RequestService } from './requestService';

@Injectable({
  providedIn: 'root',
})
export class DocGeneratorService {
  constructor(
    private http: HttpClient,
    private requestService: RequestService
  ) {}

  generateDoc(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto
  ): any {
    console.log(resultForm);
    this.http
      .get('assets/docx/bail.docx', { responseType: 'arraybuffer' })
      .subscribe((data) => {
        const content = new Uint8Array(data);
        const zip = new PizZip(content);
        console.log(resultForm.firstname);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        console.log(resultForm);
        console.log(appartementSelected);
        doc.render({
          bailType: resultForm.bailType,
          bailleurName: resultForm.bailleur?.name,
          bailleurAdress: resultForm.bailleur?.adress,
          bailleurEmail: resultForm.bailleur?.email,
          bailleurTelephone: resultForm.bailleur?.telephone,
          locataireName: resultForm.name + ' ' + resultForm.firstname,
          locataireAdress: resultForm.adress,
          locataireEmail: resultForm.email,
          locataireTelephone: resultForm.telephone,
          adressLogement: resultForm.appartement?.adress,
          constructionPeriod: appartementSelected?.constructionPeriod,
          isLogiaFillature:
            resultForm.appartement?.name === 'Filature' ? ',logia' : '',
          appartementEnergieHeating: appartementSelected?.energieHeating,
          appartementEnergieWater: appartementSelected?.energieWater,
          appartementSuface: appartementSelected?.surface,
          caracteristiquesAppartement:
            appartementSelected?.caracteristiques?.map((c) => c.description),
          hasAccessToGarageAndPoubelle:
            resultForm.appartement?.name === 'Filature' ||
            resultForm.appartement?.name === 'Chateau Gaillard',
          dateFrom: resultForm?.getFormattedFromDate(),
          dateTo: resultForm?.getFormattedToDate(),
          isMobilite: resultForm?.bailType === BailTypeEnum.MOBILITE,
          isEtudiant: resultForm?.bailType === BailTypeEnum.ETUDIANT,
          isIndetermine: resultForm?.bailType === BailTypeEnum.INDETERMINER,
          hasMobiliteAndEtudiant:
            resultForm?.bailType === BailTypeEnum.MOBILITE ||
            resultForm?.bailType === BailTypeEnum.ETUDIANT,
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
            resultForm.priceNoCharge - (resultForm.appartement?.rentRefMaj ?? 0)
          ).toFixed(2),
          rentRefMaj: (
            resultForm.priceNoCharge - (resultForm.appartement?.rentRefMaj ?? 0)
          ).toFixed(2),
          isFilature4D:
            resultForm.appartement?.formName ===
            AppartementNameEnum.FILATURE_4D,
          isFilature3G:
            resultForm.appartement?.formName ===
            AppartementNameEnum.FILATURE_3G,
          isChateauGaillard17B:
            resultForm.appartement?.formName ===
            AppartementNameEnum.CHATEAU_GAILLARD_17B,
          isChateauGaillard53A:
            resultForm.appartement?.formName ===
            AppartementNameEnum.CHATEAU_GAILLARD_53A,
          isRueRene:
            resultForm.appartement?.formName === AppartementNameEnum.RUE_RENE,
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
          petRule: resultForm.appartement?.petRule,
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
          isChargeList: resultForm.chargeList,
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'Projet_bail_' + resultForm.name + '.docx');
        console.log('Projet_bail_' + resultForm + '.docx');

        // Save generation history
        const generation = new Generation(
          new Date(),
          resultForm.appartement?.name ?? '',
          resultForm.name + ' ' + resultForm.firstname,
          resultForm
        );
        this.requestService.saveGeneration(generation).subscribe({
          next: () => console.log('Generation saved successfully'),
          error: (err) => console.error('Error saving generation', err),
        });
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
          locataireName: resultForm.name + ' ' + resultForm.firstname,
          locataireAdress: resultForm.adress,
          locataireEmail: resultForm.email,
          locataireTelephone: resultForm.telephone,
          adressLogement: resultForm.appartement?.adress ?? '',
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
    const date = new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate()
    );

    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();

    return lastDay - date.getDate() + 1;
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
