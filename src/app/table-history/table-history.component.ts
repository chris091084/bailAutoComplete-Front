import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RequestService } from '../service/requestService';
import { Generation } from '../model/Generation.model';
import { Brouillon } from '../model/Brouillon.model';
import { messageErreurHttp } from '../service/http-error.util';

@Component({
    selector: 'app-table-history',
    imports: [CommonModule],
    templateUrl: './table-history.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./table-history.component.scss']
})
export class TableHistoryComponent implements OnInit {
  generations: Generation[] = [];
  /** Les saisies mises de côté, qui n'ont pas encore produit de bail. */
  brouillons: Brouillon[] = [];
  isLoading = false;
  isLoadingBrouillons = false;
  messageSucces: string | null = null;
  messageAvertissement: string | null = null;
  messageErreur: string | null = null;

  constructor(private requestService: RequestService, private router: Router) {
    // Message porté par la navigation (et non l'URL) : il ne doit pas réapparaître
    // quand l'utilisateur revient sur l'historique par lui-même.
    const etat = this.router.getCurrentNavigation()?.extras.state;
    const messageSucces = etat?.['messageSucces'];
    if (messageSucces) {
      this.messageSucces = messageSucces;
      setTimeout(() => (this.messageSucces = null), 6000);
    }
    // L'avertissement reste affiché, lui : il désigne quelque chose à reprendre
    // à la main (annexe, fiche locataire), pas une bonne nouvelle qui s'efface.
    this.messageAvertissement = etat?.['messageAvertissement'] ?? null;
  }

  ngOnInit(): void {
    this.loadGenerations();
    this.loadBrouillons();
  }

  loadGenerations() {
    this.isLoading = true;
    this.requestService.getGenerations().subscribe({
      next: (data) => {
        this.generations = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching generations', error);
        this.isLoading = false;
        this.messageErreur = messageErreurHttp(
          error,
          "L'historique n'a pas pu être chargé"
        );
      },
    });
  }

  loadBrouillons() {
    this.isLoadingBrouillons = true;
    this.requestService.getBrouillons().subscribe({
      next: (data) => {
        this.brouillons = data;
        this.isLoadingBrouillons = false;
      },
      error: (error) => {
        console.error('Error fetching brouillons', error);
        this.isLoadingBrouillons = false;
        this.messageErreur = messageErreurHttp(
          error,
          "Les saisies en cours n'ont pas pu être chargées"
        );
      },
    });
  }

  rehydrate(generation: Generation) {
    this.router.navigate(['/'], {
      state: { rehydrationData: generation.resultForm },
    });
  }

  /**
   * Reprendre une saisie renvoie son id au formulaire : le prochain
   * enregistrement réécrira cette ligne au lieu d'en créer une seconde.
   */
  reprendreBrouillon(brouillon: Brouillon) {
    this.router.navigate(['/'], {
      state: { rehydrationData: brouillon, brouillonId: brouillon.id },
    });
  }

  supprimerBrouillon(brouillon: Brouillon) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette saisie ?')) {
      return;
    }

    this.messageErreur = null;
    this.requestService.supprimerBrouillon(brouillon.id).subscribe({
      next: () => {
        this.brouillons = this.brouillons.filter((b) => b.id !== brouillon.id);
      },
      error: (error) => {
        console.error('Brouillon non supprimé', error);
        this.messageErreur = messageErreurHttp(
          error,
          "La saisie n'a pas pu être supprimée"
        );
      },
    });
  }

  /** Une saisie interrompue n'a pas forcément de nom : elle reste identifiable. */
  nomLocataire(brouillon: Brouillon): string {
    const nom = [brouillon.name, brouillon.firstname]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nom || 'Locataire non renseigné';
  }
}
