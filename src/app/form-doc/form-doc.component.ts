import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Appartement } from '../model/appartement.model';
import { Bailleur } from '../model/bailleur.model';
import { ResultForm } from '../model/resultForm.model';
import { RequestService } from '../service/requestService';
import { Chambre } from '../model/Chambre.model';
import { HttpClient } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';
import { ErrorMessagesComponent } from '../error-messages/error-messages.component';
import { CommonModule } from '@angular/common';
import { DocGeneratorService } from '../service/doc-generator.service';
import { LacataireFieldsComponent } from './lacataire-fields/lacataire-fields.component';

@Component({
  standalone: true,
  selector: 'app-form-doc',
  templateUrl: './form-doc.component.html',
  styleUrls: ['./form-doc.component.scss'],
  imports: [
    ErrorMessagesComponent,
    CommonModule,
    ReactiveFormsModule,
    LacataireFieldsComponent,
  ],
})
export class FormDocComponent {
  //APPARTEMENT

  appartments: AppartementDto[] = [];

  typeBails = ['Mobilité', 'Etudiant', 'Indéterminé'];
  pieces: string[] = [];
  bailleurSelected: any;
  appartementName: string | undefined;
  typeResidences = ['Principale', 'Secondaire'];
  resultForm: ResultForm = new ResultForm();
  appartementSelected?: AppartementDto;
  modifyRentRefMaj: boolean = false;
  modifyRentRef: boolean = false;
  dateNow = new Date();
  modifyValIrl?: boolean = false;
  modifyTirl?: boolean = false;
  isSubmit: boolean = false;
  typBailSelected: string = '';

  // Formulaire de document
  formDoc = new FormGroup({
    name: new FormControl('', Validators.required),
    firstname: new FormControl('', Validators.required),
    adress: new FormControl('', Validators.required),
    email: new FormControl('', Validators.required),
    telephone: new FormControl(''),
    from: new FormControl('', Validators.required),
    to: new FormControl({ value: '', disabled: true }),
    motif: new FormControl(
      '',
      this.typBailSelected === 'Mobilité' ? Validators.required : null
    ),
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
    tIrl: new FormControl({ value: '', disabled: true }, Validators.required),
    valIrl: new FormControl({ value: '', disabled: true }, Validators.required),
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
  constructor(
    private requestService: RequestService,
    private docGeneratorService: DocGeneratorService
  ) {
    this.requestService.getAppartements().subscribe((data) => {
      if (data && Array.isArray(data)) {
        this.appartments = data;
      } else {
        console.error('Données invalides reçues', data);
      }
    });
  }

  onSubmit() {
    console.log(this.formDoc.get('firstname'));
    this.isSubmit = true;
    console.log(
      { type: 'date', value: new Date(), fmt: 'DD/MM/YYYY' }.value.getDate()
    );
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
      this.resultForm.rentRef = this.formDoc.get('rentRef')?.value;
      this.resultForm.rentRefMaj = this.formDoc.get('rentRefMaj')?.value;
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
      this.requestService.saveLeaseRequest(this.resultForm).subscribe({
        next: () => console.log('Form saved successfully'),
        error: (err) => console.error('Error saving form', err),
      });

      this.docGeneratorService.generateDoc(
        this.resultForm,
        this.appartementSelected
      );
    }
  }

  switchRooms(rooms: Chambre[], bailleur: any, appartement: AppartementDto) {
    this.pieces = rooms.map((chambre) => chambre.piece!);
    this.bailleurSelected = bailleur;
    console.log(bailleur);
    this.appartementSelected = appartement;
    this.formDoc.patchValue({
      rentRef: appartement.rentRef,
      rentRefMaj: appartement.rentRefMaj,
      tIrl: appartement.tIrl,
      valIrl: appartement.valIrl,
    });
  }

  isMobilite(typBail: string) {
    console.log(typBail);
    typBail == 'Indéterminé'
      ? this.formDoc.get('to')?.disable()
      : this.formDoc.get('to')?.enable();
    this.typBailSelected = typBail;
  }

  sentValIrlTirl(
    value: string | null | undefined,
    fieldName: 'valIrl' | 'tIrl'
  ) {
    console.log(value, fieldName, this.appartementSelected?.id);

    const otherField: 'valIrl' | 'tIrl' =
      fieldName === 'valIrl' ? 'tIrl' : 'valIrl';
    if (this.formDoc.get(fieldName)?.enabled === false) {
      if (fieldName == 'valIrl') {
        this.modifyValIrl = true;
      } else {
        this.modifyTirl = true;
      }
      this.formDoc.disable();
      this.formDoc.get(fieldName)?.enable();

      return;
    }
    if (this.formDoc.get(fieldName)?.enabled === true) {
      console.log('helloSave', fieldName);
      if (fieldName == 'valIrl') {
        this.modifyValIrl = false;
      } else {
        this.modifyTirl = false;
      }
      this.requestService
        .setValIrlTirl(fieldName, value)
        .subscribe((data) => {});
      this.formDoc.enable();

      this.formDoc.get(fieldName)?.disable();
      this.formDoc.get(otherField)?.disable();
      this.formDoc.get('rentRef')?.disable();
      this.formDoc.get('rentRefMaj')?.disable();
    }
  }

  setRentRef(
    value: number | null | undefined,
    fieldName: 'rentRef' | 'rentRefMaj'
  ) {
    const otherField: 'rentRef' | 'rentRefMaj' =
      fieldName === 'rentRef' ? 'rentRefMaj' : 'rentRef';
    if (this.formDoc.get(fieldName)?.enabled === false) {
      if (fieldName == 'rentRef') {
        this.modifyRentRef = true;
      } else {
        this.modifyRentRefMaj = true;
      }
      this.formDoc.disable();
      this.formDoc.get(fieldName)?.enable();

      return;
    }
    if (this.formDoc.get(fieldName)?.enabled === true) {
      console.log('helloSave', fieldName);
      if (fieldName == 'rentRef') {
        this.modifyRentRef = false;
      } else {
        this.modifyRentRefMaj = false;
      }
      this.requestService
        .setRentRef(this.appartementSelected?.id, fieldName, value)
        .subscribe((data) => {});
      this.formDoc.enable();

      this.formDoc.get(fieldName)?.disable();
      this.formDoc.get(otherField)?.disable();
      this.formDoc.get('valIrl')?.disable();
      this.formDoc.get('tIrl')?.disable();
    }
  }

  isInvalid(fieldName: string): boolean {
    const fieldControl = this.formDoc.get(fieldName);
    if (!fieldControl) {
      return false;
    }
    return (
      (fieldControl?.invalid && this.isSubmit) ||
      (fieldControl.invalid && fieldControl.touched)
    );
  }
}
