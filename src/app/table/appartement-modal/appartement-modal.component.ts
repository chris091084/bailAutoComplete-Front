import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AppartementDto } from '../../model/AppartementDto.model';
import { Bailleur } from '../../model/bailleur.model';

@Component({
  selector: 'app-appartement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appartement-modal.component.html',
  styleUrls: ['./appartement-modal.component.scss'],
})
export class AppartementModalComponent implements OnInit {
  @Input() appartement: AppartementDto | null = null;
  @Output() save = new EventEmitter<AppartementDto>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      adress: ['', Validators.required],
      surface: [''],
      rentRef: [0],
      rentRefMaj: [0],
      bailleurName: [''], // Simplification: Editing Bailleur Name flatly for now
    });
  }

  ngOnInit(): void {
    if (this.appartement) {
      this.form.patchValue({
        ...this.appartement,
        bailleurName: this.appartement.bailleur?.name,
      });
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: AppartementDto = {
        ...this.appartement, // Keep original fields
        ...formValue,
        // Reconstruct bailleur object simply for now
        bailleur: {
          ...this.appartement?.bailleur,
          name: formValue.bailleurName,
        },
      };
      this.save.emit(result);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
