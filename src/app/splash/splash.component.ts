import { Component, computed, inject, input } from '@angular/core';

import { BackendReadinessService } from '../service/backend-readiness.service';

/**
 * Écran de démarrage plein écran affiché tant que le backend en scale-to-zero
 * n'a pas répondu. Il masque entièrement la navbar et le router-outlet.
 */
@Component({
  standalone: true,
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent {
  private readonly readiness = inject(BackendReadinessService);

  /** Passe à vrai pendant le fondu de sortie, juste avant le démontage. */
  readonly leaving = input(false);

  readonly progress = this.readiness.progress;

  readonly statusMessage = computed(() =>
    this.readiness.isSlow()
      ? 'Le serveur se réveille, cela peut prendre jusqu’à une minute.'
      : 'Connexion au serveur…'
  );
}
