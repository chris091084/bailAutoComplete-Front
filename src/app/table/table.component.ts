import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestService } from '../service/requestService';
import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { AppartementModalComponent } from './appartement-modal/appartement-modal.component';
import { LocatairesTableComponent } from '../locataires/locataires-table/locataires-table.component';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, AppartementModalComponent, LocatairesTableComponent],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent implements OnInit {
  appartements: AppartementDto[] = [];
  showModal = false;
  selectedAppartement: AppartementDto | null = null;

  /**
   * Les locataires en place, rangés par `appartement_id` : chaque ligne du
   * tableau s'ouvre sur les siens. Une seule requête pour toute la liste, on ne
   * recharge pas à chaque dépliage.
   */
  locatairesParAppartement = new Map<number, LocataireDto[]>();

  /** Ids des appartements dépliés — le repli est l'état par défaut. */
  private appartementsOuverts = new Set<string>();

  private readonly aucunLocataire: LocataireDto[] = [];

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.loadAppartements();
    this.loadLocataires();
  }

  loadAppartements() {
    this.requestService.getAppartements().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.appartements = data;
        } else {
          console.error('Invalid data received', data);
        }
      },
      error: (err) => console.error('Error fetching appartements', err),
    });
  }

  /**
   * Les locataires sortis ne sont pas repris : l'accordéon montre qui occupe le
   * logement aujourd'hui, l'historique reste sur l'écran des locataires.
   */
  loadLocataires() {
    this.requestService.getLocataires().subscribe({
      next: (data) => {
        const parAppartement = new Map<number, LocataireDto[]>();
        (data ?? []).forEach((locataire) => {
          const locataires = parAppartement.get(locataire.appartementId) ?? [];
          locataires.push(locataire);
          parAppartement.set(locataire.appartementId, locataires);
        });
        this.locatairesParAppartement = parAppartement;
      },
      error: (err) => console.error('Error fetching locataires', err),
    });
  }

  /**
   * `AppartementDto` type son id en chaîne, d'où la conversion. Le tableau vide
   * est partagé : un littéral neuf à chaque appel changerait la valeur liée à
   * chaque cycle de détection.
   */
  locatairesDe(app: AppartementDto): LocataireDto[] {
    return this.locatairesParAppartement.get(Number(app.id)) ?? this.aucunLocataire;
  }

  /**
   * Code couleur du compteur : un logement plein est au vert, un logement à
   * moitié vide au rouge. Le seuil haut est ouvert, un appartement peut loger
   * plus de quatre personnes.
   */
  classeBadgeLocataires(app: AppartementDto): string {
    const nombre = this.locatairesDe(app).length;
    if (nombre >= 4) {
      return 'text-bg-success';
    }
    return nombre === 3 ? 'text-bg-warning' : 'text-bg-danger';
  }

  estOuvert(app: AppartementDto): boolean {
    return this.appartementsOuverts.has(app.id);
  }

  basculer(app: AppartementDto) {
    if (!this.appartementsOuverts.delete(app.id)) {
      this.appartementsOuverts.add(app.id);
    }
  }

  openAddModal() {
    this.selectedAppartement = null;
    this.showModal = true;
  }

  openEditModal(app: AppartementDto) {
    this.selectedAppartement = { ...app }; // Copy to avoid direct mutation
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedAppartement = null;
  }

  onSave(app: AppartementDto) {
    if (app.id) {
      this.requestService.updateAppartement(app).subscribe(() => {
        this.loadAppartements();
        this.closeModal();
      });
    } else {
      this.requestService.addAppartement(app).subscribe(() => {
        this.loadAppartements();
        this.closeModal();
      });
    }
  }

  deleteAppartement(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet appartement ?')) {
      this.requestService.deleteAppartement(id).subscribe(() => {
        this.appartementsOuverts.delete(id);
        this.loadAppartements();
        this.loadLocataires();
      });
    }
  }
}
