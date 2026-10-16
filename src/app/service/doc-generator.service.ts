import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ResultForm } from '../model/resultForm.model';
import { AppartementDto } from '../model/AppartementDto.model';
import { remplirModeleDocxControle } from './docx.util';
import {
  controlerBalisesVides,
  controlerChampsBail,
} from './controle-bail.util';
import { AppartementNameEnum, BailTypeEnum } from '../model/enum.model';
import { joursRestantsDansLeMois, nombreDeJoursDuMois } from './prorata.util';

import { Generation } from '../model/Generation.model';
import { RequestService } from './requestService';
import {
  Observable,
  catchError,
  concatMap,
  forkJoin,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';

/** Un document produit, tant qu'il n'a pas trouvé sa destination. */
export interface DocumentGenere {
  fichier: Blob;
  nomFichier: string;
}

/** Ce que l'appelant doit savoir une fois la génération terminée. */
export interface ResultatGeneration {
  /**
   * La génération telle que l'API l'a enregistrée : elle porte l'id du
   * result_form, seule origine admise pour créer le locataire.
   */
  generation: any;
  /**
   * Le bail produit. Il n'est ni téléchargé ni envoyé ici : le service produit,
   * l'écran décide — relecture, envoi par mail, téléchargement, ou rien.
   */
  bail: DocumentGenere;
  /** Absente quand sa génération a échoué ; `avertissementAnnexe` le dit. */
  annexe: DocumentGenere | null;
  /** Renseigné quand seule l'annexe a échoué, le bail étant bien produit. */
  avertissementAnnexe: string | null;
  /** Ce que le contrôle a relevé sur le bail, à relire avant de l'envoyer. */
  anomalies: string[];
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
   * Produit le bail et son annexe, puis émet la génération enregistrée et les
   * deux documents. Tout échec du bail (modèle introuvable, remplissage
   * impossible, historique non écrit) sort par le canal d'erreur :
   * l'utilisateur doit l'apprendre, un message en console ne lui dit rien.
   *
   * L'annexe, elle, ne fait pas échouer la génération : le bail est produit
   * quand elle part, son absence se signale sans l'annuler.
   */
  generateDoc(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<ResultatGeneration> {
    return forkJoin({
      bail: this.genererBail(resultForm, appartementSelected),
      annexe: this.genererAnnexe(resultForm, appartementSelected).pipe(
        map((annexe) => ({ annexe, avertissement: null as string | null })),
        catchError((err) => {
          console.error('Annexe non générée', err);
          return of({
            annexe: null,
            avertissement:
              "L'annexe (état des lieux) n'a pas pu être produite : elle est à générer à la main.",
          });
        }),
      ),
    }).pipe(
      map(({ bail, annexe }) => ({
        generation: bail.generation,
        bail: bail.document,
        annexe: annexe.annexe,
        avertissementAnnexe: annexe.avertissement,
        anomalies: bail.anomalies,
      })),
    );
  }

  /**
   * Le bail est produit, puis l'historique écrit : c'est le document qui
   * compte, la trace vient ensuite. L'ordre inverse laisserait une ligne
   * d'historique sans document en face.
   *
   * La trace est écrite même si le bail n'est finalement ni téléchargé ni
   * envoyé : elle est ce qui permettra de le renvoyer plus tard.
   */
  private genererBail(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<{
    generation: any;
    document: DocumentGenere;
    anomalies: string[];
  }> {
    const champs = this.champsBail(resultForm, appartementSelected);

    return this.http
      .get('assets/docx/bail.docx', { responseType: 'arraybuffer' })
      .pipe(
        switchMap((modele) => from(remplirModeleDocxControle(modele, champs))),
        concatMap(({ fichier, balisesVides }) =>
          this.requestService
            .saveGeneration(
              new Generation(
                new Date(),
                resultForm.appartement?.name ?? '',
                resultForm.name + ' ' + resultForm.firstname,
                resultForm,
              ),
            )
            .pipe(
              map((generation) => ({
                generation,
                document: {
                  fichier,
                  nomFichier: 'Projet_bail_' + resultForm.name + '.docx',
                },
                anomalies: [
                  ...controlerChampsBail(champs),
                  ...controlerBalisesVides(balisesVides),
                ],
              })),
            ),
        ),
      );
  }

  private genererAnnexe(
    resultForm: ResultForm,
    appartementSelected?: AppartementDto,
  ): Observable<DocumentGenere> {
    // Les logements d'une même résidence partagent leurs annexes : le préfixe
    // vient de l'appartement plutôt que de son nom, désormais unique.
    const prefixeAnnexe = appartementSelected?.prefixeAnnexe;
    const chambreNumber = resultForm.room?.split(' ')[1];

    return this.http
      .get('assets/docx/doc-annexe/' + prefixeAnnexe + chambreNumber + '.docx', {
        responseType: 'arraybuffer',
      })
      .pipe(
        switchMap((modele) =>
          from(
            remplirModeleDocxControle(modele, {
              locataireName: resultForm.name + ' ' + resultForm.firstname,
              locataireAdress: resultForm.adress,
              locataireEmail: resultForm.email,
              locataireTelephone: resultForm.telephone,
              adressLogement: resultForm.appartement?.adress ?? '',
              dateFrom: resultForm?.getFormattedFromDate(),
            }),
          ),
        ),
        map(({ fichier }) => ({
          fichier,
          nomFichier: 'Annexe_1_Etat_des_lieux_' + resultForm.name + '.docx',
        })),
      );
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
        (resultForm.priceNoCharge * joursRestantsDansLeMois(resultForm.from)) /
        nombreDeJoursDuMois(
          resultForm.from.getMonth() + 1,
          resultForm.from.getFullYear(),
        )
      ).toFixed(2),
      howDayOfMonth: nombreDeJoursDuMois(
        resultForm.from.getMonth() + 1,
        resultForm.from.getFullYear(),
      ),
      dayLeft: joursRestantsDansLeMois(resultForm.from),
      chargePriceLeft: (
        (resultForm.chargePrice * joursRestantsDansLeMois(resultForm.from)) /
        nombreDeJoursDuMois(
          resultForm.from.getMonth() + 1,
          resultForm.from.getFullYear(),
        )
      ).toFixed(2),
      totalRentProMonth: resultForm.priceNoCharge + resultForm.chargePrice,
      totalMontNotCompletRent: (
        ((resultForm.priceNoCharge + resultForm.chargePrice) *
          joursRestantsDansLeMois(resultForm.from)) /
        nombreDeJoursDuMois(
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

  private dateNow(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
