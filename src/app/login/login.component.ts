import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService, LoginMethods, toApiError } from '../service/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
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

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /** `null` tant que l'API n'a pas dit quels moyens de connexion existent. */
  readonly methods = signal<LoginMethods | null>(null);
  readonly methodsFailed = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Délai d'attente en secondes renvoyé par un 429. */
  readonly retryAfter = signal<number | null>(null);

  readonly showEmailForm = signal(false);
  readonly isSendingLink = signal(false);
  readonly linkSent = signal(false);
  readonly linkError = signal<string | null>(null);

  get passwordControl() {
    return this.form.controls.password;
  }

  get emailControl() {
    return this.emailForm.controls.email;
  }

  ngOnInit(): void {
    this.loadMethods();
  }

  loadMethods(): void {
    this.methodsFailed.set(false);
    this.auth.methods().subscribe({
      next: (methods) => this.methods.set(methods),
      error: () => this.methodsFailed.set(true),
    });
  }

  /** Connexion par passkey : aucun mot de passe, le navigateur demande biométrie ou PIN. */
  submitPasskey(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.startSubmit();

    this.auth.loginWithPasskey().subscribe({
      next: () => this.onLoggedIn(),
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error instanceof HttpErrorResponse
            ? toApiError(error).message
            : 'Validation du passkey annulée ou impossible. Réessayez.'
        );
        this.retryAfter.set(
          error instanceof HttpErrorResponse ? toApiError(error).retryAfter ?? null : null
        );
      },
    });
  }

  /** Amorçage : tant qu'aucun passkey n'existe, le mot de passe ouvre la session. */
  submitPassword(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.startSubmit();

    this.auth.login(this.form.getRawValue().password).subscribe({
      next: () => this.onLoggedIn(),
      error: (error: unknown) => {
        const apiError = toApiError(error);
        this.isSubmitting.set(false);
        this.errorMessage.set(apiError.message);
        this.retryAfter.set(apiError.retryAfter ?? null);
        this.passwordControl.reset();
        // Un 403 signifie qu'un passkey a été enregistré entre-temps.
        if (apiError.status === 403) {
          this.loadMethods();
        }
      },
    });
  }

  submitEmail(): void {
    if (this.emailForm.invalid || this.isSendingLink()) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isSendingLink.set(true);
    this.linkError.set(null);

    this.auth.requestMagicLink(this.emailForm.getRawValue().email.trim()).subscribe({
      next: () => {
        this.isSendingLink.set(false);
        this.linkSent.set(true);
      },
      error: (error: unknown) => {
        this.isSendingLink.set(false);
        this.linkError.set(toApiError(error).message);
      },
    });
  }

  toggleEmailForm(): void {
    this.showEmailForm.update((value) => !value);
    this.linkSent.set(false);
    this.linkError.set(null);
  }

  /** Formate le délai d'un 429 en texte lisible. */
  retryAfterLabel(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  private startSubmit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.retryAfter.set(null);
  }

  private onLoggedIn(): void {
    this.isSubmitting.set(false);
    void this.router.navigateByUrl(this.redirectTarget());
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
