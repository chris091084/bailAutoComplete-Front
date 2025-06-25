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
    fieldName: 'valIrl' | 'tIrl'
  ) => void;
  @Input() formDoc!: FormGroup;
  @Input() isSubmit!: boolean;
  @Input() modifyTirl: boolean | undefined;
  @Input() modifyValIrl!: boolean | undefined;
  @Input() appartementSelected!: AppartementDto;
  @Input() pieces: string[] = [];
}
