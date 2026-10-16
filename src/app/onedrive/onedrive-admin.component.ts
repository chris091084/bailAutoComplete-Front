import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { messageErreurHttp } from '../service/http-error.util';
import { OnedriveService, StatutOneDrive } from '../service/onedrive.service';

/**
 * Page d'administration du stockage des photos : le bailleur connecte son
 * OneDrive UNE fois. Le locataire, lui, ne voit jamais Microsoft.
 *
 *   [Connecter OneDrive] ─► page de consentement Microsoft ─► retour ici (?statut=ok)
 */
@Component({
  selector: 'app-onedrive-admin',
  imports: [DatePipe],
  templateUrl: './onedrive-admin.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class OnedriveAdminComponent implements OnInit {
  private readonly onedrive = inject(OnedriveService);
  private readonly route = inject(ActivatedRoute);

  readonly statut = signal<StatutOneDrive | null>(null);
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  /** Résultat du retour de Microsoft, lu dans l'adresse (`?statut=ok|erreur`). */
  readonly retour = signal<'ok' | 'erreur' | null>(null);

  ngOnInit(): void {
    const retour = this.route.snapshot.queryParamMap.get('statut');
    this.retour.set(retour === 'ok' || retour === 'erreur' ? retour : null);
    void this.charger();
  }

  async connecter(): Promise<void> {
    this.erreur.set(null);
    this.enCours.set(true);
    try {
      const { url } = await firstValueFrom(this.onedrive.urlAutorisation());
      // Navigation complète : c'est Microsoft qui affiche la page de consentement.
      window.location.assign(url);
    } catch (e) {
      this.erreur.set(
        messageErreurHttp(e, 'La connexion à OneDrive n’a pas pu démarrer'),
      );
      this.enCours.set(false);
    }
  }

  async deconnecter(): Promise<void> {
    if (
      !window.confirm(
        'Déconnecter OneDrive ? Les photos déjà envoyées restent dans votre OneDrive, mais les nouvelles ne pourront plus être enregistrées.',
      )
    ) {
      return;
    }

    this.enCours.set(true);
    try {
      await firstValueFrom(this.onedrive.deconnecter());
      this.retour.set(null);
      await this.charger();
    } catch (e) {
      this.erreur.set(messageErreurHttp(e, 'La déconnexion a échoué'));
    } finally {
      this.enCours.set(false);
    }
  }

  private async charger(): Promise<void> {
    try {
      this.statut.set(await firstValueFrom(this.onedrive.statut()));
    } catch (e) {
      this.erreur.set(messageErreurHttp(e, 'L’état de OneDrive n’a pas pu être lu'));
    }
  }
}
