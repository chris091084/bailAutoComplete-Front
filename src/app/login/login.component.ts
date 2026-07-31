import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, toApiError } from '../service/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [ReactiveFormsModule],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72),
      ],
    ],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Délai d'attente en secondes renvoyé par un 429. */
  readonly retryAfter = signal<number | null>(null);

  get passwordControl() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.retryAfter.set(null);

    this.auth.login(this.form.getRawValue().password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigateByUrl(this.redirectTarget());
      },
      error: (error: unknown) => {
        const apiError = toApiError(error);
        this.isSubmitting.set(false);
        this.errorMessage.set(apiError.message);
        this.retryAfter.set(apiError.retryAfter ?? null);
        this.passwordControl.reset();
      },
    });
  }

  /** Formate le délai d'un 429 en texte lisible. */
  retryAfterLabel(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  /** N'accepte qu'une URL interne, pour éviter une redirection ouverte. */
  private redirectTarget(): string {
    const requested = this.route.snapshot.queryParams['redirectTo'];
    if (
      typeof requested === 'string' &&
      requested.startsWith('/') &&
      !requested.startsWith('//')
    ) {
      return requested;
    }
    return '/';
  }
}
