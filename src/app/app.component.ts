import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { switchMap, timer } from 'rxjs';

import { AuthService } from './service/auth.service';
import { BackendReadinessService } from './service/backend-readiness.service';
import { SplashComponent } from './splash/splash.component';

/**
 * En deçà, l'instance était déjà chaude : afficher le splash ne ferait que
 * provoquer un clignotement.
 */
const SPLASH_DELAY_MS = 400;

/** Doit rester aligné sur la transition d'opacité de `.splash`. */
const SPLASH_FADE_MS = 300;

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SplashComponent],
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly readiness = inject(BackendReadinessService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  title = 'bailAutoComplet';

  readonly isAuthenticated = this.auth.isAuthenticated;

  /** Vrai tant que le backend n'a pas répondu et que la session n'a pas été relue. */
  readonly isBooting = signal(true);

  /** Anti-flash : le splash n'est monté que si l'attente dépasse SPLASH_DELAY_MS. */
  readonly showSplash = signal(false);

  /** Déclenche le fondu de sortie avant le démontage du splash. */
  readonly isSplashLeaving = signal(false);

  ngOnInit(): void {
    timer(SPLASH_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isBooting()) {
          this.showSplash.set(true);
        }
      });

    this.readiness
      .waitForBackend()
      .pipe(
        // La réhydratation n'a de sens qu'une fois le conteneur réveillé :
        // lancée avant, elle expirerait et ferait perdre la session.
        switchMap(() => this.auth.restoreSession()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => this.finishBoot(),
        // Un splash bloqué est le pire échec possible : on ouvre l'application
        // et on laisse chaque écran gérer ses propres erreurs.
        error: () => this.finishBoot(),
      });
  }

  logout(): void {
    // AuthService se charge de la navigation vers /login.
    this.auth.logout().subscribe();
  }

  private finishBoot(): void {
    if (!this.showSplash()) {
      // Instance déjà chaude : rien n'a été affiché, rien à faire disparaître.
      this.revealApp();
      return;
    }

    this.isSplashLeaving.set(true);
    timer(SPLASH_FADE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revealApp());
  }

  private revealApp(): void {
    this.isBooting.set(false);
    this.showSplash.set(false);
    // La navigation initiale est différée (voir AppRoutingModule) : sinon
    // authGuard interrogerait l'API endormie et redirigerait vers /login
    // avant même que la session ait pu être relue.
    this.router.initialNavigation();
  }
}
