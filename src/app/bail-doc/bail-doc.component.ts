import { Component, EventEmitter, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormDocComponent } from '../form-doc/form-doc.component';
import { ResultForm } from '../model/resultForm.model';

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

  constructor(private modalService: NgbModal) {}

  ngOnInit(): void {
    const modalRef = this.modalService.open(FormDocComponent, { size: 'lg' });

    modalRef.closed.subscribe((resultForm: ResultForm) => {
      this.formData = resultForm;
      console.log(resultForm, 'la modale');
    });
  }
}
