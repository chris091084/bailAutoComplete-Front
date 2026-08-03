import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  filter,
  ignoreElements,
  map,
  merge,
  of,
  repeat,
  take,
  tap,
  timeout,
  timer,
} from 'rxjs';

import { environment } from 'environments/environment';

/** Corps renvoyé par la sonde de démarrage, en 200 comme en 503. */
export interface ReadinessResponse {
  status: 'UP' | 'STARTING';
  database: 'UP' | 'DOWN';
  uptimeMs: number;
}

/** Au-delà, le conteneur ne répondra pas à cette requête : on en relance une. */
const REQUEST_TIMEOUT_MS = 10_000;
/** Intervalle entre deux sondes tant que le backend n'est pas prêt. */
const RETRY_DELAY_MS = 2_000;
/** Passé ce délai, on prévient l'utilisateur que le réveil est en cours. */
const SLOW_THRESHOLD_MS = 15_000;
/** Durée de la montée simulée de la barre jusqu'à PROGRESS_CEILING. */
const PROGRESS_DURATION_MS = 20_000;
/**
 * Plafond de la barre tant que le 200 n'est pas arrivé : le backend ne renvoie
 * aucun avancement réel, une barre à 100 % avant l'heure serait un mensonge.
 */
const PROGRESS_CEILING = 90;
/** Fréquence de rafraîchissement de la barre. */
const PROGRESS_TICK_MS = 100;

/**
 * Sonde l'API hébergée en scale-to-zero : après une période d'inactivité, la
 * première requête doit attendre le réveil du conteneur (plusieurs secondes).
 */
@Injectable({
  providedIn: 'root',
})
export class BackendReadinessService {
  private readonly http = inject(HttpClient);
  private readonly readinessUrl = `${environment.apiUrl}/actuator/health/readiness`;

  private readonly ready = signal(false);
  private readonly slow = signal(false);
  private readonly progressValue = signal(0);

  /** Vrai dès qu'une sonde a répondu 200 avec `status: 'UP'`. */
  readonly isReady = this.ready.asReadonly();

  /** Vrai quand l'attente dépasse SLOW_THRESHOLD_MS : le conteneur démarre à froid. */
  readonly isSlow = this.slow.asReadonly();

  /** Avancement affichable, de 0 à 100. */
  readonly progress = this.progressValue.asReadonly();

  /**
   * Émet une seule fois, dès que le backend est prêt, puis complète. Sonde
   * immédiatement puis toutes les RETRY_DELAY_MS, sans limite de tentatives :
   * un conteneur endormi finit toujours par répondre, et abandonner laisserait
   * l'utilisateur devant un écran mort.
   */
  waitForBackend(): Observable<void> {
    return defer(() => {
      this.ready.set(false);
      this.slow.set(false);
      this.progressValue.set(0);

      // La barre avance seule : la sonde ne renvoie que « prêt » ou « pas prêt ».
      // L'index d'émission sert d'horloge, ce qui évite de dépendre de Date.now().
      const progress$ = timer(0, PROGRESS_TICK_MS).pipe(
        tap((tickIndex) => this.updateProgress(tickIndex * PROGRESS_TICK_MS)),
        ignoreElements()
      );

      const probe$ = defer(() => this.probe()).pipe(
        repeat({ delay: RETRY_DELAY_MS }),
        filter((isUp) => isUp),
        tap(() => {
          this.ready.set(true);
          this.slow.set(false);
          this.progressValue.set(100);
        }),
        map(() => undefined)
      );

      // `take(1)` termine dès la première réponse prête et coupe la minuterie
      // de progression, qui n'émet jamais rien par elle-même.
      return merge(progress$, probe$).pipe(take(1));
    });
  }

  /** Une tentative : 200 « UP » = prêt, tout le reste (503, 0, timeout) = pas prêt. */
  private probe(): Observable<boolean> {
    return this.http.get<ReadinessResponse>(this.readinessUrl).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((response) => response.status === 'UP'),
      catchError(() => of(false))
    );
  }

  private updateProgress(elapsedMs: number): void {
    const ratio = Math.min(1, elapsedMs / PROGRESS_DURATION_MS);
    this.progressValue.set(Math.round(ratio * PROGRESS_CEILING));

    if (elapsedMs >= SLOW_THRESHOLD_MS) {
      this.slow.set(true);
    }
  }
}
