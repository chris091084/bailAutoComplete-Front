import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-error-messages',
  templateUrl: './error-messages.component.html',
  styleUrls: ['./error-messages.component.scss'],
  imports: [CommonModule],
})
export class ErrorMessagesComponent {
  @Input() control: AbstractControl | null = null;
  @Input() isSubmit: boolean = false;
}
