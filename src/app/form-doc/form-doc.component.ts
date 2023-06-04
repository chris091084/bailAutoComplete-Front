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
    to: new FormControl({ value: '', disabled: true }),
    motif: new FormControl('', Validators.required),
    room: new FormControl('', Validators.required),
    appartement: new FormControl(
      new Appartement(
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
    'sylvain.bodin@gmail.com / christian.coley@hotmail.fr',
    '06 13 88 31 01 / 06 50 27 92 53'
  );
  //caracteristiques
  caracteristiques1 = [
    "L'entrée du logement et son couloir (8.20m²),",
    'La cuisine entièrement équipée (9,53m²),',
    'Le salon (17.58m²),',
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
    'Filature',
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
    'Etablissement bancaire : Crédit Mutuel de Bretagne – Louvigné du Désert</br>IBAN : FR76 1558 9351 5600 3177 7744 286</br>Code BIC : CMBRFR2BXXX',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur. Cette interdiction résulte du règlement de copropriété de la résidence. Ce règlement est joint en annexe.",
    '1968',
    '81,18',
    209.04,
    251.66,
    '1000'
  );
  appartement2 = new Appartement(
    'Chateau Gaillard',
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
    'Etablissement bancaire : Crédit Mutuel de Bretagne – Louvigné du Désert</br>IBAN : FR76 1558 9351 5600 3177 7744 383</br>Code BIC : CMBRFR2BXXX',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur.",
    '1946-1970',
    '73,78',
    189.98,
    228.72,
    '3000'
  );
  appartement3 = new Appartement(
    'Rue René',
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
    'Etablissement bancaire : Crédit Agricole Ille et Vilaine – Maen Roch</br>IBAN : FR76 1360 6000 3346 3385 5675 616</br>Code BIC : AGRIFRPP83',
    "La détention d'animaux domestiques n'est pas autorisée par le bailleur.",
    '1946-1970',
    '72,83',
    187.54,
    225.77,
    '1000'
  );

  appartments = [this.appartement1, this.appartement2, this.appartement3];
  typeBails = ['Mobilité', 'Etudiant'];
  rooms: string[] = [];
  bailleurSelected: any;
  resultForm: ResultForm = new ResultForm();

  constructor(private activeModal: NgbActiveModal) {}

  onSubmit() {
    // if (
    //   this.formDoc.get('from') !== null &&
    //   this.formDoc.get('from') !== undefined
    // ) {
    //   // verify if this.formDoc.get('from') is not null

    //   console.log(this.formDoc.value.from);

    //   let dateFrom = new Date(this.formDoc.get('from')?.getRawValue());
    //   console.log(dateFrom);

    //   let date: Date | undefined | null =
    //     dateFrom !== null && dateFrom !== undefined ? dateFrom : new Date();
    //   if (date !== null && date !== undefined) {
    //     const mois = date.getMonth();
    //     const annee = date.getFullYear();
    //     const dernierJour = new Date(annee, mois + 1, 0).getDate();

    //     const joursRestants = dernierJour - date.getDate();

    //     console.log(joursRestants);
    //   }
    // }
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

      this.activeModal.close(this.resultForm);
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
    }
  }

  switchRooms(rooms: any, bailleur: any) {
    console.log(rooms);
    this.rooms = rooms;
    this.bailleurSelected = bailleur;
  }

  isMobilite(typBail: string) {
    console.log(typBail);
    typBail == 'Etudiant'
      ? this.formDoc.get('to')?.disable()
      : this.formDoc.get('to')?.enable();
  }
}
