import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Observable } from 'rxjs';

import { AuthService, PasskeySummary } from '../service/auth.service';

/** Gestion des passkeys : ajout, liste, suppression. */
@Component({
  selector: 'app-securite',
  templateUrl: './securite.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe, FormsModule],
})
export class SecuriteComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly passkeys = signal<PasskeySummary[]>([]);
  readonly isBusy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  label = '';

  ngOnInit(): void {
    this.load();
  }

  add(): void {
    this.run(this.auth.registerPasskey(this.label.trim() || 'Passkey'), () => {
      this.label = '';
      this.load();
    });
  }

  remove(passkey: PasskeySummary): void {
    if (!confirm(`Supprimer le passkey « ${passkey.label} » ?`)) {
      return;
    }
    this.run(this.auth.deletePasskey(passkey.id), () => this.load());
  }

  private load(): void {
    this.auth.listPasskeys().subscribe({
      next: (list) => this.passkeys.set(list),
      error: () => this.errorMessage.set('Impossible de charger les passkeys.'),
    });
  }

  private run(action: Observable<unknown>, done: () => void): void {
    this.isBusy.set(true);
    this.errorMessage.set(null);
    action.subscribe({
      next: () => {
        this.isBusy.set(false);
        done();
      },
      error: () => {
        this.isBusy.set(false);
        this.errorMessage.set('Opération annulée ou impossible. Réessayez.');
      },
    });
  }
}
