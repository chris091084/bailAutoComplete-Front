import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LocataireDto } from '../../model/LocataireDto.model';
import { RequestService } from '../../service/requestService';

@Component({
  selector: 'app-locataire-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './locataire-modal.component.html',
  styleUrls: ['./locataire-modal.component.scss'],
})
export class LocataireModalComponent implements OnInit {
  @Input() locataire: LocataireDto | null = null;
  @Output() save = new EventEmitter<LocataireDto>();
  @Output() cancel = new EventEmitter<void>();

  // AppartementDto type son id en `string` alors que l'API renvoie un nombre :
  // les options sont normalisées ici pour que la comparaison avec
  // `appartementId` (un nombre) sélectionne bien la ligne en édition.
  appartementsOptions: { id: number; label: string }[] = [];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService
  ) {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      telephone: [''],
      email: ['', Validators.email],
      appartementId: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadAppartements();

    if (this.locataire) {
      this.form.patchValue(this.locataire);
    }
  }

  loadAppartements() {
    this.requestService.getAppartements().subscribe({
      next: (data) => {
        this.appartementsOptions = (data ?? []).map((appartement) => ({
          id: Number(appartement.id),
          label: appartement.name,
        }));
      },
      error: (err) => console.error('Error fetching appartements', err),
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: LocataireDto = {
        id: this.locataire?.id,
        nom: formValue.nom,
        prenom: formValue.prenom,
        telephone: formValue.telephone || null,
        email: formValue.email || null,
        appartementId: Number(formValue.appartementId),
      };
      this.save.emit(result);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
