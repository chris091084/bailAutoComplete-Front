import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from 'environments/environment';

/** Toutes les routes d'authentification renvoient uniquement ce booléen. */
export interface AuthStatusResponse {
  authenticated: boolean;
}

/** Corps d'erreur renvoyé par l'API NestJS. `message` peut être une chaîne ou un tableau. */
export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

/** Erreur API normalisée, directement affichable. */
export interface ApiError {
  status: number;
  message: string;
  /** Présent uniquement sur un 429 : délai d'attente en secondes. */
  retryAfter?: number;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null;
}

/**
 * Normalise le champ `message` de l'API : chaîne simple (401, 429) ou tableau
 * de chaînes (400, validation class-validator).
 */
export function normalizeApiMessage(message: string | string[] | undefined): string {
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  return message ?? '';
}

function defaultMessageFor(status: number): string {
  switch (status) {
    case 0:
      return "Le serveur est injoignable. Vérifiez votre connexion.";
    case 401:
      return 'Mot de passe incorrect';
    case 429:
      return 'Trop de tentatives échouées, réessayez plus tard';
    default:
      return "Une erreur inattendue est survenue.";
  }
}

/** Convertit n'importe quelle erreur HTTP en message affichable. */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, message: defaultMessageFor(0) };
  }

  const body: unknown = error.error;
  if (!isApiErrorBody(body)) {
    return { status: error.status, message: defaultMessageFor(error.status) };
  }

  const message = normalizeApiMessage(body.message);
  const retryAfter = typeof body.retryAfter === 'number' ? body.retryAfter : undefined;

  return {
    status: error.status,
    message: message.length > 0 ? message : defaultMessageFor(error.status),
    ...(retryAfter === undefined ? {} : { retryAfter }),
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly authenticated = signal(false);

  /**
   * État de session courant. L'API ne renvoie qu'un booléen : il n'y a aucun
   * profil utilisateur à stocker, et les jetons sont en cookies httpOnly.
   */
  readonly isAuthenticated = this.authenticated.asReadonly();

  /** Met à jour l'état local sans appel réseau (utilisé par l'interceptor). */
  setAuthenticated(value: boolean): void {
    this.authenticated.set(value);
  }

  login(password: string): Observable<void> {
    return this.http
      .post<AuthStatusResponse>(`${this.authUrl}/login`, { password })
      .pipe(
        tap((response) => this.authenticated.set(response.authenticated)),
        map(() => undefined)
      );
  }

  logout(): Observable<void> {
    return this.http.post<AuthStatusResponse>(`${this.authUrl}/logout`, null).pipe(
      // Même si l'API refuse, la session locale doit être abandonnée.
      catchError(() => of<AuthStatusResponse>({ authenticated: false })),
      tap(() => {
        this.authenticated.set(false);
        void this.router.navigate(['/login']);
      }),
      map(() => undefined)
    );
  }

  refresh(): Observable<void> {
    return this.http.post<AuthStatusResponse>(`${this.authUrl}/refresh`, null).pipe(
      tap((response) => this.authenticated.set(response.authenticated)),
      catchError((error: unknown) => {
        this.authenticated.set(false);
        return throwError(() => error);
      }),
      map(() => undefined)
    );
  }

  checkSession(): Observable<boolean> {
    return this.http.get<AuthStatusResponse>(`${this.authUrl}/me`).pipe(
      map((response) => response.authenticated),
      catchError(() => of(false)),
      tap((authenticated) => this.authenticated.set(authenticated))
    );
  }

  /**
   * Réhydratation au démarrage : les cookies survivent au rechargement, mais le
   * front l'ignore tant qu'il n'a pas demandé. Si l'access token est expiré
   * (`/auth/me` en 401, jamais rejoué par l'interceptor pour éviter une boucle),
   * on tente un refresh unique avant de conclure que la session est perdue.
   */
  restoreSession(): Observable<boolean> {
    return this.checkSession().pipe(
      switchMap((authenticated) =>
        authenticated
          ? of(true)
          : this.refresh().pipe(
              map(() => true),
              catchError(() => of(false))
            )
      )
    );
  }
}
