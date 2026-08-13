
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
    selector: 'app-error-messages',
    templateUrl: './error-messages.component.html',
    styleUrls: ['./error-messages.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: []
})
export class ErrorMessagesComponent {
  @Input() control: AbstractControl | null = null;
  @Input() isSubmit: boolean = false;
}
