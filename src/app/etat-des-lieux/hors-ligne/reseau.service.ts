import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Connexion de l'appareil, d'après les événements `online` / `offline` du
 * navigateur. Attention : « en ligne » veut seulement dire « un réseau est
 * branché », pas « le serveur répond » — d'où le rôle de la file de synchro,
 * qui juge sur les réponses réelles.
 */
@Injectable({ providedIn: 'root' })
export class ReseauService {
  readonly enLigne = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  /** Émet à chaque retour du réseau : le signal pour rejouer ce qui attend. */
  readonly retourEnLigne$ = new Subject<void>();

  constructor() {
    const surRetour = (): void => {
      this.enLigne.set(true);
      this.retourEnLigne$.next();
    };
    const surPerte = (): void => this.enLigne.set(false);

    window.addEventListener('online', surRetour);
    window.addEventListener('offline', surPerte);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', surRetour);
      window.removeEventListener('offline', surPerte);
    });
  }
}
