import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

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
    to: new FormControl('', Validators.required),
    motif: new FormControl('', Validators.required),
    room: new FormControl('', Validators.required),
    appartment: new FormControl('', Validators.required),
    priceNoCharge: new FormControl('', Validators.required),
    chargePrice: new FormControl('', Validators.required),
  });

  appartments = ['fillature', 'chateau gaillard', 'rue rené'];
  typeBails = ['Mobilité', 'Etudiant'];
  rooms = ['chambre1', 'chambre2', 'chambre3', 'chambre4'];

  constructor() {}

  onSubmit() {
    console.log(this.formDoc.value);
  }
}
