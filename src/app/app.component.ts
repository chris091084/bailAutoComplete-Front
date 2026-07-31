import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  title = 'bailAutoComplet';

  readonly isAuthenticated = this.auth.isAuthenticated;

  logout(): void {
    // AuthService se charge de la navigation vers /login.
    this.auth.logout().subscribe();
  }
}
