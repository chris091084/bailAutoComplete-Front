import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestService } from '../service/requestService';
import { LocataireDto } from '../model/LocataireDto.model';
import { LocataireModalComponent } from './locataire-modal/locataire-modal.component';

@Component({
  selector: 'app-locataires',
  standalone: true,
  imports: [CommonModule, LocataireModalComponent],
  templateUrl: './locataires.component.html',
  styleUrls: ['./locataires.component.scss'],
})
export class LocatairesComponent implements OnInit {
  locataires: LocataireDto[] = [];
  showModal = false;
  selectedLocataire: LocataireDto | null = null;

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.loadLocataires();
  }

  loadLocataires() {
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
  }

  openAddModal() {
    this.selectedLocataire = null;
    this.showModal = true;
  }

  openEditModal(locataire: LocataireDto) {
    this.selectedLocataire = { ...locataire }; // Copy to avoid direct mutation
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedLocataire = null;
  }

  onSave(locataire: LocataireDto) {
    if (locataire.id) {
      this.requestService.updateLocataire(locataire).subscribe(() => {
        this.loadLocataires();
        this.closeModal();
      });
    } else {
      this.requestService.addLocataire(locataire).subscribe(() => {
        this.loadLocataires();
        this.closeModal();
      });
    }
  }

  deleteLocataire(id?: number) {
    if (id == null) {
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
      this.requestService.deleteLocataire(id).subscribe(() => {
        this.loadLocataires();
      });
    }
  }
}
