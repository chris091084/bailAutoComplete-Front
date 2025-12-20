import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestService } from '../service/requestService';
import { ResultForm } from '../model/resultForm.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  history: ResultForm[] = [];

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    this.requestService.getLeaseRequests().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.history = data;
        } else {
          console.error('Invalid history data received', data);
        }
      },
      error: (err) => console.error('Error fetching history', err),
    });
  }
}
