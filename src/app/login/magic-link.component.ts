import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, toApiError } from '../service/auth.service';

/**
 * Destination du lien reçu par email : `/login/magic#token=…`.
 *
 * Le jeton est lu dans le fragment (jamais envoyé au serveur du front) puis
 * échangé contre une session. On enchaîne sur la page Sécurité : c'est là qu'on
 * enregistre le passkey qui rendra ce lien inutile la fois suivante.
 */
@Component({
  selector: 'app-magic-link',
  template: `
    <div class="login-wrapper">
      <div class="card shadow-sm login-card">
        <div class="card-body p-4 text-center">
          @if (errorMessage(); as message) {
            <h1 class="h5 mb-3">Lien impossible à utiliser</h1>
            <p class="text-muted">{{ message }}</p>
            <a class="btn btn-primary" routerLink="/login">Retour à la connexion</a>
          } @else {
            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            <span>Connexion en cours…</span>
          }
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink],
})
export class MagicLinkComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token');

    if (!token) {
      this.errorMessage.set("Ce lien est incomplet. Demandez-en un nouveau depuis la page de connexion.");
      return;
    }

    this.auth.verifyMagicLink(token).subscribe({
      // replaceUrl : le jeton (déjà consommé) ne reste pas dans l'historique.
      next: () => void this.router.navigateByUrl('/securite', { replaceUrl: true }),
      error: (error: unknown) => this.errorMessage.set(toApiError(error).message),
    });
  }
}
