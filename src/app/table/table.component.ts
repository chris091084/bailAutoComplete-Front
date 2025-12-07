import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestService } from '../service/requestService';
import { AppartementDto } from '../model/AppartementDto.model';
import { AppartementModalComponent } from './appartement-modal/appartement-modal.component';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, AppartementModalComponent],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent implements OnInit {
  appartements: AppartementDto[] = [];
  showModal = false;
  selectedAppartement: AppartementDto | null = null;

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.loadAppartements();
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
        this.loadAppartements();
      });
    }
  }
}
