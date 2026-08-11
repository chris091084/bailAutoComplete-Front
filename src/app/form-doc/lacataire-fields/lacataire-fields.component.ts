import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  ControlContainer,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorMessagesComponent } from 'src/app/error-messages/error-messages.component';
import { AppartementDto } from 'src/app/model/AppartementDto.model';

@Component({
  selector: 'app-lacataire-fields',
  standalone: true,
  imports: [ErrorMessagesComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './lacataire-fields.component.html',
  styleUrl: './lacataire-fields.component.scss',
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
})
export class LacataireFieldsComponent {
  @Input() isInvalid!: (fieldName: string) => boolean;
  @Input() sentValIrlTirl!: (
    tIrlValue: string | null | undefined,
    fieldName: 'valIrl' | 'tIrl',
  ) => void;
  @Input() formDoc!: FormGroup;
  @Input() isSubmit!: boolean;
  @Input() modifyTirl: boolean | undefined;
  @Input() modifyValIrl!: boolean | undefined;
  @Input() appartementSelected!: AppartementDto;
  @Input() pieces: string[] = [];

  /** Bornes du sélecteur de date, alignées sur ce que l'API accepte. */
  readonly dateNaissanceMin = '1900-01-01';
  readonly dateNaissanceMax = new Date().toISOString().slice(0, 10);

  /**
   * Âge déduit de la date saisie, affiché en repère sous le champ. `null` tant
   * que la date est vide ou refusée : mieux vaut ne rien montrer qu'un âge
   * absurde.
   */
  get age(): number | null {
    const dateNaissance = this.formDoc?.get('dateNaissance');
    if (!dateNaissance?.value || dateNaissance.invalid) {
      return null;
    }

    const naissance = new Date(dateNaissance.value);
    const aujourdHui = new Date();
    let age = aujourdHui.getFullYear() - naissance.getFullYear();
    // L'anniversaire de l'année en cours n'est pas encore passé.
    const moisEcoule = aujourdHui.getMonth() - naissance.getMonth();
    if (
      moisEcoule < 0 ||
      (moisEcoule === 0 && aujourdHui.getDate() < naissance.getDate())
    ) {
      age--;
    }
    return age;
  }
}
