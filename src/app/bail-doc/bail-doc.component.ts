import { Component, EventEmitter, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormDocComponent } from '../form-doc/form-doc.component';
import { ResultForm } from '../model/resultForm.model';
import { Appartement } from '../model/appartement.model';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import * as saveAs from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { DateLeft } from '../pipe/dateLeft.pipe';
import { emitDistinctChangesOnlyDefaultValue } from '@angular/compiler';

@Component({
  selector: 'app-bail-doc',
  templateUrl: './bail-doc.component.html',
  styleUrls: ['./bail-doc.component.scss'],
})
export class BailDocComponent implements OnInit {
  doFilter = new EventEmitter<any>();
  formData: ResultForm = new ResultForm();

  dateToday = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  constructor(private modalService: NgbModal, private http: HttpClient) {
    const modalRef = this.modalService.open(FormDocComponent, { size: 'lg' });
    modalRef.closed.subscribe((resultForm: ResultForm) => {
      if (resultForm != null) {
        this.formData = resultForm;
        if (resultForm.appartement != null) {
          if (this.formData.appartement != undefined) {
            this.formData.appartement = new Appartement(
              resultForm.appartement.name,
              resultForm.appartement.bailleur,
              resultForm.appartement.adresse,
              resultForm.appartement.chambres,
              resultForm.appartement.caracteristiques,
              resultForm.appartement.energieWater,
              resultForm.appartement.energieHeating,
              resultForm.appartement.bankName,
              resultForm.appartement.pet,
              resultForm.appartement.constructionPeriod,
              resultForm.appartement.surface,
              resultForm.appartement.rentRef,
              resultForm.appartement.rentMaj,
              resultForm.appartement.maxConsoElec
            );
          }
        }
      }
      console.log(resultForm, 'la modale');
    });
  }

  ngOnInit(): void {
    console.log(this.formData.appartement.name);
  }

  generate() {
    console.log(this.formData.getFormattedFromDate());
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
          bailType: this.formData.bailType,
          bailleurName: this.formData.bailleur?.name,
          bailleurAdress: this.formData.bailleur?.adresse,
          bailleurEmail: this.formData.bailleur?.email,
          bailleurTelephone: this.formData.bailleur?.telephone,
          locataireName: this.formData.name,
          locataireAdress: this.formData.adress,
          locataireEmail: this.formData.email,
          locataireTelephone: this.formData.telephone,
          adressLogement: this.formData.appartement.adresse,
          constructionPeriod: this.formData.appartement.constructionPeriod,
          isLogiaFillature:
            this.formData.appartement.name === 'Filature' ? ',logia' : '',
          appartementEnergieHeating: this.formData.appartement.energieHeating,
          appartementEnergieWater: this.formData.appartement.energieWater,
          appartementSuface: this.formData.appartement.surface,
          caracteristiquesAppartement:
            this.formData.appartement.caracteristiques,
          hasAccessToGarageAndPoubelle:
            this.formData.appartement?.name === 'Filature' ||
            this.formData.appartement?.name === 'Chateau Gaillard',
          dateFrom: this.formData?.getFormattedFromDate(),
          isMobilite: this.formData?.bailType === 'Mobilité',
          isEtudiant: this.formData?.bailType === 'Etudiant',
          isIndetermine: this.formData?.bailType === 'Indéterminé',
          priceNocharge: this.formData.priceNoCharge,
          appartementRentRef: this.formData.appartement.rentRef,
          appartementRentMaj: this.formData.appartement.rentMaj,
          rentRef: (
            this.formData.priceNoCharge - this.formData.appartement.rentMaj
          ).toFixed(2),
          rentComp: (
            this.formData.priceNoCharge - this.formData.appartement.rentMaj
          ).toFixed(2),
          isFilature: this.formData.appartement?.name === 'Filature',
          isChateauGaillard:
            this.formData.appartement?.name === 'Chateau Gaillard',
          isRueRene: this.formData.appartement?.name === 'rue René',
          rentWithoutCharge: this.formData.lastPriceWithoutCharge,
          tIrl: this.formData.tIrl,
          valIrl: this.formData.valIrl,
          chargePrice: this.formData.chargePrice,
          rentPrice: (
            (this.formData.priceNoCharge * this.dateLeft(this.formData.from)) /
            this.numberOfDays(
              this.formData.from.getMonth() + 1,
              this.formData.from.getFullYear()
            )
          ).toFixed(2),
          howDayOfMonth: this.numberOfDays(
            this.formData.from.getMonth() + 1,
            this.formData.from.getFullYear()
          ),
          dayLeft: this.dateLeft(this.formData.from),
          chargePriceLeft: (
            (this.formData.chargePrice * this.dateLeft(this.formData.from)) /
            this.numberOfDays(
              this.formData.from.getMonth() + 1,
              this.formData.from.getFullYear()
            )
          ).toFixed(2),
          totalRentProMonth:
            this.formData.priceNoCharge + this.formData.chargePrice,
          totalMontNotCompletRent: (
            ((this.formData.priceNoCharge + this.formData.chargePrice) *
              this.dateLeft(this.formData.from)) /
            this.numberOfDays(
              this.formData.from.getMonth() + 1,
              this.formData.from.getFullYear()
            )
          ).toFixed(2),
          totalMontCompletRent:
            this.formData.priceNoCharge + this.formData.chargePrice,
          garantiePrice: this.formData.priceNoCharge * 2,
          isClauseLess6Month: this.formData.clauseLess6Month === true,
          petRules: this.formData.appartement.pet,
          dateNow: { type: 'date', value: new Date(), fmt: 'DD/MM/YYYY' },
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(out, 'output.docx');
      });
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
