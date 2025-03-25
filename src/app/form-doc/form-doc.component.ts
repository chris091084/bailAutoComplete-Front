import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Appartement } from '../model/appartement.model';
import { Bailleur } from '../model/bailleur.model';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResultForm } from '../model/resultForm.model';
import { RequestService } from '../service/requestService';
import { Chambre } from '../model/Chambre.model';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import * as saveAs from 'file-saver';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-form-doc',
  templateUrl: './form-doc.component.html',
  styleUrls: ['./form-doc.component.scss'],
})
export class FormDocComponent {
  formDoc = new FormGroup({
    name: new FormControl('', Validators.required),
    firstname: new FormControl('', Validators.required),
    adress: new FormControl(''),
    email: new FormControl('', Validators.required),
    telephone: new FormControl(''),
    from: new FormControl('', Validators.required),
    to: new FormControl({ value: '', disabled: true }),
    motif: new FormControl('', Validators.required),
    room: new FormControl('', Validators.required),
    appartement: new FormControl(
      new Appartement(
        '',
        '',
        new Bailleur('', '', '', ''),
        '',
        [],
        [],
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        0,
        ''
      ),
      Validators.required
    ),
    priceNoCharge: new FormControl(null, Validators.required),
    chargePrice: new FormControl(null, Validators.required),
    typeBail: new FormControl('', Validators.required),
    tIrl: new FormControl('', Validators.required),
    valIrl: new FormControl('', Validators.required),
    lastPriceWithoutCharge: new FormControl(null, Validators.required),
    chargeList: new FormControl(false),
    clauseLess6Month: new FormControl(false),
    typeResidence: new FormControl('', Validators.required),
    rentRef: new FormControl({ value: 0, disabled: true }, Validators.required),
    rentRefMaj: new FormControl(
      { value: 0, disabled: true },
      Validators.required
    ),
  });

  //APPARTEMENT

  appartments: Appartement[] = [];

  typeBails = ['Mobilité', 'Etudiant', 'Indéterminé'];
  pieces: string[] = [];
  bailleurSelected: any;
  appartementName: string | undefined;
  typeResidences = ['Principale', 'Secondaire'];
  resultForm: ResultForm = new ResultForm();
  appartementSelected?: Appartement;
  modifyRentRefMaj: boolean = false;
  modifyRentRef: boolean = false;

  constructor(
    private requestService: RequestService,
    private http: HttpClient
  ) {
    this.requestService.getAppartements().subscribe((data) => {
      if (data && Array.isArray(data)) {
        this.appartments = data;
        console.log('hello');
      } else {
        console.error('Données invalides reçues', data);
      }
    });
  }

  onSubmit() {
    if (this.formDoc.valid) {
      console.log(this.resultForm.chargePrice);

      this.resultForm.adress = this.formDoc.get('adress')?.value;

      const appartement = this.formDoc.get('appartement')?.value;
      if (appartement != null) {
        this.resultForm.appartement = appartement;
      }

      const chargePriceValue = this.formDoc.get('chargePrice')?.value;
      this.resultForm.chargePrice =
        chargePriceValue !== null && chargePriceValue !== undefined
          ? chargePriceValue
          : 0;

      // this.resultForm.chargePrice = this.formDoc.get('chargePrice')?.value;

      this.resultForm.email = this.formDoc.get('email')?.value;
      this.resultForm.firstname = this.formDoc.get('firstname')?.value;
      this.resultForm.from = new Date(this.formDoc.get('from')?.getRawValue());

      this.resultForm.motif = this.formDoc.get('motif')?.value;
      this.resultForm.name = this.formDoc.get('name')?.value;
      const priceNoChargeValue = this.formDoc.get('priceNoCharge')?.value;
      this.resultForm.priceNoCharge =
        priceNoChargeValue !== null && priceNoChargeValue !== undefined
          ? priceNoChargeValue
          : 0;

      this.resultForm.room = this.formDoc.get('room')?.value;
      this.resultForm.telephone = this.formDoc.get('telephone')?.value;
      this.resultForm.bailleur = this.bailleurSelected;
      console.log(this.formDoc.get('typeBail')?.value);
      this.resultForm.bailType = this.formDoc.get('typeBail')?.value;
      this.resultForm.tIrl = this.formDoc.get('tIrl')?.value;
      this.resultForm.valIrl = this.formDoc.get('valIrl')?.value;
      this.resultForm.chargeList = this.formDoc.get('chargeList')?.value;
      this.resultForm.lastPriceWithoutCharge = this.formDoc.get(
        'lastPriceWithoutCharge'
      )?.value;
      this.resultForm.clauseLess6Month =
        this.formDoc.get('clauseLess6Month')?.value;

      console.log(this.resultForm);

      console.log(new Date());
      // cas particulier pour les bails étudiants
      if (this.formDoc.get('typeBail')?.value == 'Etudiant') {
        let dateFrom = new Date(this.formDoc.get('from')?.getRawValue());
        let futureDate = new Date(dateFrom);

        futureDate.setMonth(dateFrom.getMonth() + 9);

        this.resultForm.to = new Date(
          futureDate.setDate(dateFrom.getDate() - 1)
        );
        console.log(this.resultForm.to);
      } else {
        this.resultForm.to = new Date(this.formDoc.get('to')?.getRawValue());
      }
      this.resultForm.typeResidence = this.formDoc.get('typeResidence')?.value;

      this.generate();
    }
  }

  switchRooms(rooms: Chambre[], bailleur: any, appartement: Appartement) {
    this.pieces = rooms.map((chambre) => chambre.piece!);
    this.bailleurSelected = bailleur;
    console.log(bailleur);
    this.appartementSelected = appartement;
    this.formDoc.patchValue({
      rentRef: appartement.rentRef,
      rentRefMaj: appartement.rentRefMaj,
    });
  }

  isMobilite(typBail: string) {
    console.log(typBail);
    typBail == 'Etudiant'
      ? this.formDoc.get('to')?.disable()
      : this.formDoc.get('to')?.enable();
  }

  private generate() {
    console.log(this.resultForm.getFormattedFromDate());
    this.http
      .get('assets/docx/bail.docx', { responseType: 'arraybuffer' })
      .subscribe((data) => {
        const content = new Uint8Array(data); // Convertir ArrayBuffer en Uint8Array
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        doc.render({
          bailType: this.resultForm.bailType,
          bailleurName: this.resultForm.bailleur?.name,
          bailleurAdress: this.resultForm.bailleur?.adresse,
          bailleurEmail: this.resultForm.bailleur?.email,
          bailleurTelephone: this.resultForm.bailleur?.telephone,
          locataireName: this.resultForm.name,
          locataireAdress: this.resultForm.adress,
          locataireEmail: this.resultForm.email,
          locataireTelephone: this.resultForm.telephone,
          adressLogement: this.resultForm.appartement.adress,
          constructionPeriod: this.appartementSelected?.constructionPeriod,
          isLogiaFillature:
            this.resultForm.appartement.name === 'Filature' ? ',logia' : '',
          appartementEnergieHeating: this.resultForm.appartement.energieHeating,
          appartementEnergieWater: this.resultForm.appartement.energieWater,
          appartementSuface: this.resultForm.appartement.surface,
          caracteristiquesAppartement:
            this.appartementSelected?.caracteristiques,
          hasAccessToGarageAndPoubelle:
            this.resultForm.appartement?.name === 'Filature' ||
            this.resultForm.appartement?.name === 'Chateau Gaillard',
          dateFrom: this.resultForm?.getFormattedFromDate(),
          dateTo: this.resultForm?.getFormattedToDate(),
          isMobilite: this.resultForm?.bailType === 'Mobilité',
          isEtudiant: this.resultForm?.bailType === 'Etudiant',
          isIndetermine: this.resultForm?.bailType === 'Indéterminé',
          hasMobiliteAndEtudiant:
            this.resultForm?.bailType === 'Mobilité' ||
            this.resultForm?.bailType === 'Etudiant',
          priceNocharge: this.resultForm.priceNoCharge,
          appartementRentRef: this.resultForm.appartement.rentRef,
          appartementRentRefMaj: this.resultForm.appartement.rentRefMaj,
          rentRef: (
            this.resultForm.priceNoCharge -
            this.resultForm.appartement.rentRefMaj
          ).toFixed(2),
          rentRefMaj: (
            this.resultForm.priceNoCharge -
            this.resultForm.appartement.rentRefMaj
          ).toFixed(2),
          isFilature: this.resultForm.appartement?.name === 'Filature',
          isChateauGaillard:
            this.resultForm.appartement?.name === 'Chateau Gaillard',
          isRueRene: this.resultForm.appartement?.name === 'rue René',
          rentWithoutCharge: this.resultForm.lastPriceWithoutCharge,
          tIrl: this.resultForm.tIrl,
          valIrl: this.resultForm.valIrl,
          chargePrice: this.resultForm.chargePrice,
          rentPrice: (
            (this.resultForm.priceNoCharge *
              this.dateLeft(this.resultForm.from)) /
            this.numberOfDays(
              this.resultForm.from.getMonth() + 1,
              this.resultForm.from.getFullYear()
            )
          ).toFixed(2),
          howDayOfMonth: this.numberOfDays(
            this.resultForm.from.getMonth() + 1,
            this.resultForm.from.getFullYear()
          ),
          dayLeft: this.dateLeft(this.resultForm.from),
          chargePriceLeft: (
            (this.resultForm.chargePrice *
              this.dateLeft(this.resultForm.from)) /
            this.numberOfDays(
              this.resultForm.from.getMonth() + 1,
              this.resultForm.from.getFullYear()
            )
          ).toFixed(2),
          totalRentProMonth:
            this.resultForm.priceNoCharge + this.resultForm.chargePrice,
          totalMontNotCompletRent: (
            ((this.resultForm.priceNoCharge + this.resultForm.chargePrice) *
              this.dateLeft(this.resultForm.from)) /
            this.numberOfDays(
              this.resultForm.from.getMonth() + 1,
              this.resultForm.from.getFullYear()
            )
          ).toFixed(2),
          totalMontCompletRent:
            this.resultForm.priceNoCharge + this.resultForm.chargePrice,
          garantiePrice: this.resultForm.priceNoCharge * 2,
          isClauseLess6Month: this.resultForm.clauseLess6Month === true,
          petRules: this.resultForm.appartement.pet,
          dateNow: { type: 'date', value: new Date(), fmt: 'DD/MM/YYYY' },
          typeResidence: this.resultForm.typeResidence,
          isResidencePrincipal: this.resultForm.typeResidence === 'Principale',
          isResidenceSecondaire: this.resultForm.typeResidence === 'Secondaire',
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'output.docx');
      });
  }

  sentRentRef(value: any, fieldName: string) {
    console.log(value, fieldName, this.appartementSelected?.id);
    if (this.formDoc.get('rentRef')?.enabled === false) {
      this.formDoc.disable();
      this.formDoc.get('rentRef')?.enable();

      return;
    }
    if (this.formDoc.get('rentRef')?.enabled === true) {
      this.requestService
        .setRentRef(this.appartementSelected?.id, value, undefined)
        .subscribe((data) => {});
      this.formDoc.enable();

      this.formDoc.get('rentRef')?.disable();
      this.formDoc.get('rentRefMaj')?.disable();
    }
  }

  sentRentRefMaj(value: any, fieldName: string) {
    console.log(value, fieldName, this.appartementSelected?.id);
    if (this.formDoc.get('rentRefMaj')?.enabled === false) {
      this.formDoc.disable();
      this.formDoc.get('rentRefMaj')?.enable();

      return;
    }
    if (this.formDoc.get('rentRefMaj')?.enabled === true) {
      this.requestService
        .setRentRef(this.appartementSelected?.id, undefined, value)
        .subscribe((data) => {});
      this.formDoc.enable();

      this.formDoc.get('rentRefMaj')?.disable();
      this.formDoc.get('rentRef')?.disable();
    }
  }

  private dateLeft(dateInput: Date) {
    const date: Date = new Date(dateInput);
    const mois: number = date.getMonth();
    const annee: number = date.getFullYear();

    const dernierJour: number = new Date(annee, mois + 1, 0).getDate();

    return dernierJour - date.getDate();
  }

  private numberOfDays(mois: number, year: number): number {
    return new Date(year, mois, 0).getDate();
  }
}
