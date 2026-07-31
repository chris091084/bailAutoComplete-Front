import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';

import { AuthService } from '../service/auth.service';

export const authGuard: CanActivateFn = (
  _route,
  state
): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Le signal peut être faux simplement parce que la session n'a pas encore été
  // vérifiée (navigation directe sur une URL profonde).
  return auth
    .checkSession()
    .pipe(
      map((authenticated) =>
        authenticated
          ? true
          : router.createUrlTree(['/login'], {
              queryParams: { redirectTo: state.url },
            })
      )
    );
};
