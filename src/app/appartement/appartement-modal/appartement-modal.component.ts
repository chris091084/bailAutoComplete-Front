import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';

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
    imports: [ReactiveFormsModule],
    templateUrl: './appartement-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./appartement-modal.component.scss']
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
      // Interrupteur : automatique (loyers de l'encadrement des loyers, champs
      // grisés) ou manuel (champs saisissables). Un nouvel appartement n'a pas
      // encore d'époque de construction : il démarre en manuel.
      rentRefAuto: [false],
      rentRef: [0],
      rentRefMaj: [0],
      bailleurName: [''], // Simplification: Editing Bailleur Name flatly for now
    });
  }

  ngOnInit(): void {
    if (this.appartement) {
      this.form.patchValue({
        ...this.appartement,
        rentRefAuto: !this.appartement.rentRefManual,
        bailleurName: this.appartement.bailleur?.name,
      });
      // En modification, seuls les loyers restent éditables.
      ['name', 'adress', 'bailleurName', 'surface'].forEach((champ) =>
        this.form.get(champ)?.disable()
      );
    }

    this.appliquerModeLoyers(this.form.get('rentRefAuto')?.value);
    this.form
      .get('rentRefAuto')
      ?.valueChanges.subscribe((auto) => this.appliquerModeLoyers(auto));
  }

  /** Automatique : champs grisés ; manuel : champs saisissables. */
  private appliquerModeLoyers(auto: boolean): void {
    ['rentRef', 'rentRefMaj'].forEach((champ) => {
      const controle = this.form.get(champ);
      if (auto) {
        controle?.disable({ emitEvent: false });
      } else {
        controle?.enable({ emitEvent: false });
      }
    });
  }

  get loyersAutomatiques(): boolean {
    return !!this.form.get('rentRefAuto')?.value;
  }

  onSubmit() {
    if (this.form.valid) {
      // `value` exclut les champs désactivés : en modification, nom, adresse,
      // propriétaire et surface restent ceux d'origine.
      // En automatique, les loyers sont désactivés donc absents de `value` : le
      // back les recalcule depuis l'encadrement des loyers.
      const { rentRefAuto, ...formValue } = this.form.value;
      const result: AppartementDto = {
        ...this.appartement, // Keep original fields
        ...formValue,
        rentRefManual: !rentRefAuto,
        bailleur: this.appartement
          ? this.appartement.bailleur
          : { name: formValue.bailleurName },
      };
      this.save.emit(result);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
