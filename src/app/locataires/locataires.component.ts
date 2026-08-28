import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RequestService } from '../service/requestService';
import { AppartementDto } from '../model/AppartementDto.model';
import { EtatLocataireEnum } from '../model/enum.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { LocatairesTableComponent } from './locataires-table/locataires-table.component';

@Component({
    selector: 'app-locataires',
    imports: [LocatairesTableComponent],
    templateUrl: './locataires.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./locataires.component.scss']
})
export class LocatairesComponent implements OnInit {
  locataires: LocataireDto[] = [];

  /**
   * Les fiches nées d'un bail généré mais pas encore signé. Elles n'occupent
   * aucun logement : ni la liste principale ni le compteur d'occupation de la
   * page appartements ne les comptent, tant que la signature n'est pas déclarée.
   */
  candidats: LocataireDto[] = [];

  /**
   * Les locataires ayant quitté le logement, servis par le même endpoint. Ils
   * ne se suppriment pas : leur bail, leurs quittances et la trace de leur
   * lettre de congé restent au dossier de l'appartement.
   */
  locatairesSortis: LocataireDto[] = [];

  /**
   * L'écran s'ouvre sur les locataires en place : c'est la liste qu'on vient
   * consulter, les candidats étant une file d'attente qu'on va vider.
   */
  ongletActif: 'candidats' | 'actifs' | 'sortis' = 'actifs';

  /**
   * Le locataire ne porte qu'un `appartementId` : le courrier a besoin de
   * l'adresse du logement et du bailleur, on garde donc les appartements sous
   * la main plutôt que de les recharger à chaque clic.
   */
  appartements: AppartementDto[] = [];

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.rechargerLocataires();
    this.loadAppartements();
  }

  /**
   * Les trois listes bougent ensemble : une signature, une sortie ou une
   * réintégration fait passer la fiche de l'une à l'autre.
   */
  rechargerLocataires() {
    this.requestService.getLocataires().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.locataires = data;
        } else {
          console.error('Invalid data received', data);
        }
      },
      error: (err) => console.error('Error fetching locataires', err),
    });

    this.requestService
      .getLocataires(EtatLocataireEnum.CANDIDAT)
      .subscribe({
        next: (data) => (this.candidats = data ?? []),
        error: (err) => console.error('Error fetching candidats', err),
      });

    this.requestService.getLocataires(EtatLocataireEnum.SORTI).subscribe({
      next: (data) => (this.locatairesSortis = data ?? []),
      error: (err) => console.error('Error fetching locataires sortis', err),
    });
  }

  private loadAppartements() {
    this.requestService.getAppartements().subscribe({
      next: (data) => (this.appartements = data ?? []),
      error: (err) => console.error('Error fetching appartements', err),
    });
  }
}
