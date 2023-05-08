import { Component, EventEmitter, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormDocComponent } from '../form-doc/form-doc.component';
import { ResultForm } from '../model/resultForm.model';
import { Appartement } from '../model/appartement.model';
import { Bailleur } from '../model/bailleur.model';

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

  constructor(private modalService: NgbModal) {
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
}
