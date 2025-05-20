import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-error-messages',
  templateUrl: './error-messages.component.html',
  styleUrls: ['./error-messages.component.scss'],
})
export class ErrorMessagesComponent {
  @Input() control: AbstractControl | null = null;
  @Input() isSubmit: boolean = false;
}
