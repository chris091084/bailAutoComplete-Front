import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RequestService } from '../service/requestService';
import { Generation } from '../model/Generation.model';

@Component({
  selector: 'app-table-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-history.component.html',
  styleUrls: ['./table-history.component.scss'],
})
export class TableHistoryComponent implements OnInit {
  generations: Generation[] = [];
  isLoading = false;

  constructor(private requestService: RequestService, private router: Router) {}

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
