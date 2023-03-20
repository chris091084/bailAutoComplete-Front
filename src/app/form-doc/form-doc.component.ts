import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Appartement } from '../model/appartement.model';
import { Bailleur } from '../model/bailleur.model';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResultForm } from '../model/resultForm.model';

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
    to: new FormControl(''),
    motif: new FormControl('', Validators.required),
    room: new FormControl('', Validators.required),
    appartement: new FormControl(undefined, Validators.required),
    priceNoCharge: new FormControl(0, Validators.required),
    chargePrice: new FormControl(0, Validators.required),
    typeBail: new FormControl(''),
  });
  //bailleurs
  bailleur1 = new Bailleur(
    'M. BODIN Sylvain',
    '118 chemin du Bassard  -  38121 CHONAS l’AMBALLAN',
    'sylvain.bodin@gmail.com',
    '06 13 88 31 01'
  );
  bailleur2 = new Bailleur(
    'M. BODIN Sylvain et M. COLEY Christian',
    '118 chemin du Bassard  -  38121 CHONAS l’AMBALLAN',
    'sylvain.bodin@gmail.com / chritian.coley@yahoo.fr',
    '06 13 88 31 01 / 06 50 27 92 53'
  );
  //caracteristiques
  caracteristiques1 = [
    "L'entrée du logement et son couloir (8.20m²),",
    'La cuisine entièrement équipée (9,53m²),',
    'Le salon (17.58m²)',
    'Le WC (1.04m²),',
    'La salle de bains (4.41m²),',
    'Une loggia (1.99m²),',
    'Un balcon (4,30m²),',
    'Des placards accessibles depuis le couloir.',
  ];
  caracteristiques2 = [
    "L'entrée du logement (3.68m²)",
    'La cuisine entièrement équipée (6.45m²)',
    'Le salon (21 m²)',
    'Le WC (0.90m²)',
    'La salle de bains (3.22m²)',
    'Un balcon (5,09m²)',
    'Des placards accessibles depuis le salon.',
  ];
  caracteristiques3 = [
    "L'entrée du logement (5,08m²)",
    'La cuisine entièrement équipée (6,41m²)',
    'Le salon (17,14m²)',
    'Le WC (0,96m²)',
    'La salle de bains (2,53m²)',
    'Un dégagement (1.35m²)',
    'Un balcon (3,52m²).',
  ];
  //APPARTEMENT
  appartement1 = new Appartement(
    'fillature',
    this.bailleur1,
    '56 rue de la Filature - 69100 VILLEURBANNE',
    [
      'Chambre 1 : 10.30 m²',
      'Chambre 2 : 9,14 m²',
      'Chambre 3 : 9,79 m²',
      'Chambre 4 : 11.19 m²',
    ],
    this.caracteristiques1,
    'chaudière à gaz',
    'collectif',
    'Etablissement bancaire : Crédit Mutuel de Bretagne – Louvigné du Désert IBAN : FR76 1558 9351 5600 3177 7744 286 Code BIC : CMBRFR2BXXX',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur. Cette interdiction résulte du règlement de copropriété de la résidence. Ce règlement est joint en annexe.",
    '1968',
    '81,18',
    202.95,
    234.54
  );
  appartement2 = new Appartement(
    'chateau gaillard',
    this.bailleur2,
    '17 bis rue Château Gaillard',
    [
      'Chambre 1 : 9.91 m²',
      'Chambre 2 : 8.20 m²',
      'Chambre 3 : 9.67 m²',
      'Chambre 4 : 10.5 m²',
    ],
    this.caracteristiques2,
    'cumulus électrique',
    'collectif',
    'Etablissement bancaire : Crédit Mutuel de Bretagne – Louvigné du Désert IBAN : FR76 1558 9351 5600 3177 7744 383 Code BIC : CMBRFR2BXXX',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur.",
    '1946-1970',
    '73,78',
    184.45,
    221.34
  );
  appartement3 = new Appartement(
    'rue rené',
    this.bailleur1,
    '1 rue René',
    [
      'Chambre 1 : 10.13 m²',
      'Chambre 2 : 10,13 m²',
      'Chambre 3 : 8,07 m²',
      'Chambre 4 : 11.03 m²',
    ],
    this.caracteristiques3,

    'chaudière à gaz',
    'individuel',
    'Etablissement bancaire : Crédit Agricole Ille et Vilaine </br> – Maen Roch  IBAN : FR76 1360 6000 3346 3385 5675 616 Code BIC : AGRIFRPP83',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur.",
    '1946-1970',
    '72,83',
    182.08,
    218.49
  );

  appartments = [this.appartement1, this.appartement2, this.appartement3];
  typeBails = ['Mobilité', 'Etudiant'];
  rooms: string[] = [];
  bailleurSelected: any;
  resultForm: ResultForm = new ResultForm();

  constructor(private activeModal: NgbActiveModal) {}

  onSubmit() {
    console.log(this.resultForm.chargePrice);

    this.resultForm.adress = this.formDoc.get('adress')?.value;
    this.resultForm.appartement = this.formDoc.get('appartement')?.value;
    const chargePriceValue = this.formDoc.get('chargePrice')?.value;
    this.resultForm.chargePrice =
      chargePriceValue !== null && chargePriceValue !== undefined
        ? chargePriceValue
        : 0;

    // this.resultForm.chargePrice = this.formDoc.get('chargePrice')?.value;

    this.resultForm.email = this.formDoc.get('email')?.value;
    this.resultForm.firstname = this.formDoc.get('firstname')?.value;
    this.resultForm.from = this.formDoc.get('from')?.value;
    this.resultForm.to = this.formDoc.get('to')?.value;
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
    console.log(this.resultForm);
    this.activeModal.close(this.resultForm);
    console.log(this.resultForm);
  }

  switchRooms(rooms: any, bailleur: any) {
    console.log(rooms);
    this.rooms = rooms;
    this.bailleurSelected = bailleur;
  }

  isMobilite(typBail: string) {
    console.log(typBail);
    typBail == 'Mobilité'
      ? this.formDoc.get('to')?.disable()
      : this.formDoc.get('to')?.enable();
  }
}
