import { Component, EventEmitter, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormDocComponent } from '../form-doc/form-doc.component';
import { ResultForm } from '../model/resultForm.model';
import { Appartement } from '../model/appartement.model';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import * as saveAs from 'file-saver';
import { HttpClient } from '@angular/common/http';

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
    console.log(this.formData);
  }

  generate() {
    this.http
      .get('assets/docx/test.docx', { responseType: 'arraybuffer' })
      .subscribe((data) => {
        const content = new Uint8Array(data); // Convertir ArrayBuffer en Uint8Array
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        doc.render({
          first_name: 'John',
          last_name: 'Doe',
          phone: '0652455478',
          description: 'New Website',
          test: 'hello',
          bailType: this.formData.bailType,
        });
        const out = doc.getZip().generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        saveAs(out, 'output.docx');
      });
  }
}
