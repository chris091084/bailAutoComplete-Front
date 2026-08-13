import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RequestService } from '../service/requestService';
import { Generation } from '../model/Generation.model';

@Component({
    selector: 'app-table-history',
    imports: [CommonModule],
    templateUrl: './table-history.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./table-history.component.scss']
})
export class TableHistoryComponent implements OnInit {
  generations: Generation[] = [];
  isLoading = false;
  messageSucces: string | null = null;

  constructor(private requestService: RequestService, private router: Router) {
    // Message porté par la navigation (et non l'URL) : il ne doit pas réapparaître
    // quand l'utilisateur revient sur l'historique par lui-même.
    const messageSucces =
      this.router.getCurrentNavigation()?.extras.state?.['messageSucces'];
    if (messageSucces) {
      this.messageSucces = messageSucces;
      setTimeout(() => (this.messageSucces = null), 6000);
    }
  }

  ngOnInit(): void {
    this.loadGenerations();
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
      },
    });
  }

  rehydrate(generation: Generation) {
    this.router.navigate(['/'], {
      state: { rehydrationData: generation.resultForm },
    });
  }
}
