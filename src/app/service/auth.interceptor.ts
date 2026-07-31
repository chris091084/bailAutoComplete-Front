import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';

import { environment } from 'environments/environment';
import { AuthService } from './auth.service';

/**
 * Routes dont les 401 ne doivent jamais déclencher de refresh : sans cette
 * exclusion, un refresh en échec se rejouerait indéfiniment.
 */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/me'];

/**
 * Refresh en vol partagé par toutes les requêtes tombées en 401 simultanément.
 * L'API fait tourner le refresh token à chaque usage : deux rotations
 * concurrentes s'invalideraient mutuellement.
 */
let refreshInFlight$: Observable<void> | null = null;

function refreshOnce(auth: AuthService): Observable<void> {
  if (refreshInFlight$ === null) {
    refreshInFlight$ = auth.refresh().pipe(
      finalize(() => {
        refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
  return refreshInFlight$;
}

function isNoRefreshRequest(req: HttpRequest<unknown>): boolean {
  return NO_REFRESH_PATHS.some((path) =>
    req.url.startsWith(`${environment.apiUrl}${path}`)
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Les fichiers statiques locaux (assets/docx/bail.docx) ne doivent recevoir
  // ni withCredentials ni logique de refresh.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const apiReq = req.clone({ withCredentials: true });

  if (isNoRefreshRequest(apiReq)) {
    return next(apiReq);
  }

  return next(apiReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return refreshOnce(auth).pipe(
        catchError((refreshError: unknown) => {
          auth.setAuthenticated(false);
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
        // Une seule tentative : l'échec de ce rejeu remonte tel quel.
        switchMap(() => next(apiReq))
      );
    })
  );
};
