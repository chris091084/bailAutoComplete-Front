import { Component } from '@angular/core';
import { FormSection } from '../model/form-section.model';
import { RequestService } from '../service/requestService';
import { AppartementDto } from '../model/AppartementDto.model';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-form-interface',
  templateUrl: './form-interface.component.html',
  styleUrls: ['./form-interface.component.scss'],
})
export class FormInterfaceComponent {
  appartments: AppartementDto[] = [];
  optionsRadio: any[] = [];
  typeResidences = ['Principale', 'Secondaire'];
  typeBails = ['Mobilité', 'Etudiant', 'Indéterminé'];
  pieces: string[] = [];
  formSections: FormSection[] = [];

  constructor(private requestService: RequestService) {}
  ngOnInit() {
    this.requestService.getAppartements().subscribe((data) => {
      if (data && Array.isArray(data)) {
        this.appartments = data;
        console.log(this.appartments);
        if (this.appartments.length > 0) {
          this.formSections = [
            {
              title: 'Appartement',
              fields: [
                {
                  name: 'appartement',
                  label: 'Choisissez un appartement',
                  type: 'radio',
                  items: this.appartments,
                },
              ],
            },
            /* {
            title: 'Type de résidence',
            fields: [
              {
                name: 'typeResidence',
                label: 'Type de résidence',
                type: 'radio',
                items: this.appartments,
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Type de bail',
            fields: [
              {
                name: 'typeBail',
                label: 'Type de bail',
                type: 'radio',
                items: this.appartments,
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Le locataire',
            fields: [
              {
                name: 'name',
                label: 'Nom',
                type: 'text',
                validators: [Validators.required],
              },
              {
                name: 'firstname',
                label: 'Prénom',
                type: 'text',
                validators: [Validators.required],
              },
              {
                name: 'adress',
                label: 'Adresse complète',
                type: 'text',
                validators: [Validators.required],
              },
              {
                name: 'email',
                label: 'Email',
                type: 'text',
                validators: [Validators.required, Validators.email],
              },
              { name: 'telephone', label: 'Téléphone', type: 'text', validators: [] },
            ],
          },
          {
            title: 'Dates',
            fields: [
              {
                name: 'from',
                label: 'Date de début',
                type: 'date',
                validators: [Validators.required],
              },
              {
                name: 'to',
                label: 'Date de fin',
                type: 'date',
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Indice IRL',
            fields: [
              {
                name: 'tIrl',
                label: 'Trimestre de l’IRL',
                type: 'text',
                validators: [Validators.required],
              },
              {
                name: 'valIrl',
                label: 'Valeur de l’IRL',
                type: 'number',
                validators: [Validators.required],
              },
              {
                name: 'motif',
                label: 'Motif (si bail mobilité)',
                type: 'text',
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Pièces',
            fields: [
              {
                name: 'room',
                label: 'Pièces disponibles',
                type: 'radio',
                items: this.appartments,
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Loyer',
            fields: [
              {
                name: 'priceNoCharge',
                label: 'Loyer hors charges (€)',
                type: 'number',
                validators: [Validators.required],
              },
              {
                name: 'chargePrice',
                label: 'Charges (€)',
                type: 'number',
                validators: [Validators.required],
              },
              {
                name: 'lastPriceWithoutCharge',
                label: 'Dernier loyer hors charges (€)',
                type: 'number',
                validators: [Validators.required],
              },
              {
                name: 'rentRef',
                label: 'Tarif au m² de référence',
                type: 'number',
                validators: [Validators.required],
              },
              {
                name: 'rentRefMaj',
                label: 'Tarif au m² de référence majoré',
                type: 'number',
                validators: [Validators.required],
              },
            ],
          },
          {
            title: 'Autres options',
            fields: [
              {
                name: 'chargeList',
                label: 'Liste des charges',
                type: 'checkbox',
                validators: [],
              },
              {
                name: 'clauseLess6Month',
                label: 'Clause < 6 mois',
                type: 'checkbox',
                validators: [],
              },
            ],
          }, */
          ];
        }
      }
    });
    console.log(this.appartments);
  }
}
