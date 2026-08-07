import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestService } from '../service/requestService';
import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { LocatairesTableComponent } from './locataires-table/locataires-table.component';

@Component({
  selector: 'app-locataires',
  standalone: true,
  imports: [CommonModule, LocatairesTableComponent],
  templateUrl: './locataires.component.html',
  styleUrls: ['./locataires.component.scss'],
})
export class LocatairesComponent implements OnInit {
  locataires: LocataireDto[] = [];

  /**
   * Les locataires ayant quitté le logement, servis par le même endpoint. Ils
   * ne se suppriment pas : leur bail, leurs quittances et la trace de leur
   * lettre de congé restent au dossier de l'appartement.
   */
  locatairesSortis: LocataireDto[] = [];
  ongletActif: 'actifs' | 'sortis' = 'actifs';

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
   * Les deux listes bougent ensemble : une sortie ou une réintégration fait
   * passer la fiche de l'une à l'autre.
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

    this.requestService.getLocataires(true).subscribe({
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
