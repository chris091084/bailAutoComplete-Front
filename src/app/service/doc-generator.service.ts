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
import { Observable, catchError, concatMap, forkJoin, map, of, tap } from 'rxjs';

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Ce que l'appelant doit savoir une fois la génération terminée. */
export interface ResultatGeneration {
  /**
   * La génération telle que l'API l'a enregistrée : elle porte l'id du
   * result_form, seule origine admise pour créer le locataire.
   */
  generation: any;
  /** Renseigné quand seule l'annexe a échoué, le bail étant bien produit. */
  avertissementAnnexe: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DocGeneratorService {
  constructor(
    private http: HttpClient,
    private requestService: RequestService,
  ) {}

  /**
   * Produit le bail et son annexe, puis émet la génération enregistrée. Tout
   * échec du bail (modèle introuvable, remplissage impossible, historique non
   * écrit) sort par le canal d'erreur : l'utilisateur doit l'apprendre, un
   * message en console ne lui dit rien.
   *
   * L'annexe, elle, ne fait pas échouer la génération : le bail est déjà
   * téléchargé quand elle part, son absence se signale sans l'annuler.
   */
  generateDoc(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<ResultatGeneration> {
    return forkJoin({
      generation: this.genererBail(resultForm, appartementSelected),
      avertissementAnnexe: this.genererAnnexe(
        resultForm,
        appartementSelected,
      ).pipe(
        map(() => null),
        catchError((err) => {
          console.error('Annexe non générée', err);
          return of(
            "L'annexe (état des lieux) n'a pas pu être produite : elle est à générer à la main.",
          );
        }),
      ),
    });
  }

  /**
   * Le document est téléchargé avant que l'historique ne soit écrit : c'est le
   * bail qui compte, la trace vient ensuite. L'ordre inverse laisserait une
   * ligne d'historique sans document en face.
   */
  private genererBail(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<any> {
    return this.http
      .get('assets/docx/bail.docx', { responseType: 'arraybuffer' })
      .pipe(
        map((modele) =>
          this.remplirModele(
            modele,
            this.champsBail(resultForm, appartementSelected),
          ),
        ),
        tap((document) =>
          saveAs(document, 'Projet_bail_' + resultForm.name + '.docx'),
        ),
        concatMap(() =>
          this.requestService.saveGeneration(
            new Generation(
              new Date(),
              resultForm.appartement?.name ?? '',
              resultForm.name + ' ' + resultForm.firstname,
              resultForm,
            ),
          ),
        ),
      );
  }

  private genererAnnexe(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<void> {
    // Les logements d'une même résidence partagent leurs annexes : le préfixe
    // vient de l'appartement plutôt que de son nom, désormais unique.
    const prefixeAnnexe = appartementSelected?.prefixeAnnexe;
    const chambreNumber = resultForm.room?.split(' ')[1];

    return this.http
      .get('assets/docx/doc-annexe/' + prefixeAnnexe + chambreNumber + '.docx', {
        responseType: 'arraybuffer',
      })
      .pipe(
        map((modele) =>
          this.remplirModele(modele, {
            locataireName: resultForm.name + ' ' + resultForm.firstname,
            locataireAdress: resultForm.adress,
            locataireEmail: resultForm.email,
            locataireTelephone: resultForm.telephone,
            adressLogement: resultForm.appartement?.adress ?? '',
            dateFrom: resultForm?.getFormattedFromDate(),
          }),
        ),
        map((document) => {
          saveAs(document, 'Annexe_1_Etat_des_lieux_' + resultForm.name + '.docx');
        }),
      );
  }

  /**
   * Remplit un modèle Word. `render()` lève dès qu'une balise du modèle n'a pas
   * son champ : l'exception traverse l'observable, plutôt que de rester dans
   * une souscription où personne ne l'attendait.
   */
  private remplirModele(
    modele: ArrayBuffer,
    champs: Record<string, unknown>,
  ): Blob {
    const doc = new Docxtemplater(new PizZip(new Uint8Array(modele)), {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(champs);

    return doc.getZip().generate({ type: 'blob', mimeType: MIME_DOCX });
  }

  private champsBail(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Record<string, unknown> {
    return {
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
      isLogiaFillature: resultForm.appartement?.aLoggia ? ',logia' : '',
      appartementEnergieHeating: appartementSelected?.energieHeating,
      appartementEnergieWater: appartementSelected?.energieWater,
      appartementSuface: appartementSelected?.surface,
      caracteristiquesAppartement: appartementSelected?.caracteristiques?.map(
        (c) => c.description,
      ),
      hasAccessToGarageAndPoubelle:
        resultForm.appartement?.aGaragePoubelle ?? false,
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
        ((resultForm.rentRefMaj ?? 0) * (appartementSelected?.surface ?? 0)) /
        4
      ).toFixed(2),
      rentRef: (
        resultForm.priceNoCharge - (resultForm.appartement?.rentRefMaj ?? 0)
      ).toFixed(2),
      rentRefMaj: (
        resultForm.priceNoCharge - (resultForm.appartement?.rentRefMaj ?? 0)
      ).toFixed(2),
      isFilature4D:
        resultForm.appartement?.name === AppartementNameEnum.FILATURE_4D,
      isFilature3G:
        resultForm.appartement?.name === AppartementNameEnum.FILATURE_3G,
      isChateauGaillard17B:
        resultForm.appartement?.name ===
        AppartementNameEnum.CHATEAU_GAILLARD_17B,
      isChateauGaillard53A:
        resultForm.appartement?.name ===
        AppartementNameEnum.CHATEAU_GAILLARD_53A,
      isRueRene: resultForm.appartement?.name === AppartementNameEnum.RUE_RENE,
      rentWithoutCharge: resultForm.priceNoCharge,
      tIrl: resultForm.tIrl,
      valIrl: resultForm.valIrl,
      chargePrice: resultForm.chargePrice,
      rentPrice: resultForm.priceNoCharge,
      lastPriceWithoutCharge: resultForm.lastPriceWithoutCharge,
      etage: appartementSelected?.etage,
      proportionalRent: (
        (resultForm.priceNoCharge * this.dateLeft(resultForm.from)) /
        this.numberOfDays(
          resultForm.from.getMonth() + 1,
          resultForm.from.getFullYear(),
        )
      ).toFixed(2),
      howDayOfMonth: this.numberOfDays(
        resultForm.from.getMonth() + 1,
        resultForm.from.getFullYear(),
      ),
      dayLeft: this.dateLeft(resultForm.from),
      chargePriceLeft: (
        (resultForm.chargePrice * this.dateLeft(resultForm.from)) /
        this.numberOfDays(
          resultForm.from.getMonth() + 1,
          resultForm.from.getFullYear(),
        )
      ).toFixed(2),
      totalRentProMonth: resultForm.priceNoCharge + resultForm.chargePrice,
      totalMontNotCompletRent: (
        ((resultForm.priceNoCharge + resultForm.chargePrice) *
          this.dateLeft(resultForm.from)) /
        this.numberOfDays(
          resultForm.from.getMonth() + 1,
          resultForm.from.getFullYear(),
        )
      ).toFixed(2),
      totalMontCompletRent: resultForm.priceNoCharge + resultForm.chargePrice,
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
        ((resultForm.rentRefMaj ?? 0) * (appartementSelected?.surface ?? 0)) / 4
      ).toFixed(2),
      isChargeList: resultForm.chargeList,
    };
  }

  private dateLeft(dateInput: Date) {
    const date = new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate(),
    );

    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
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
