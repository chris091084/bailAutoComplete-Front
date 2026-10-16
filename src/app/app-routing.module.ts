import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormDocComponent } from './form-doc/form-doc.component';
import { LoginComponent } from './login/login.component';
import { MagicLinkComponent } from './login/magic-link.component';
import { authGuard } from './guard/auth.guard';
import { AppartementComponent } from './appartement/appartement.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'login/magic', component: MagicLinkComponent },
  { path: '', component: FormDocComponent, canActivate: [authGuard] },
  { path: 'table', component: AppartementComponent, canActivate: [authGuard] },
  {
    path: 'locataires',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./locataires/locataires.component').then(
        (m) => m.LocatairesComponent
      ),
  },
  {
    // Page PUBLIQUE du locataire : le jeton du lien fait office d'authentification,
    // d'où l'absence d'authGuard.
    path: 'edl/:token',
    loadComponent: () =>
      import('./etat-des-lieux/etat-des-lieux-page/etat-des-lieux-page.component').then(
        (m) => m.EtatDesLieuxPageComponent
      ),
  },
  {
    path: 'etats-des-lieux',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./etats-des-lieux-admin/etats-des-lieux-admin.component').then(
        (m) => m.EtatsDesLieuxAdminComponent
      ),
  },
  {
    path: 'onedrive',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./onedrive/onedrive-admin.component').then(
        (m) => m.OnedriveAdminComponent
      ),
  },
  {
    path: 'securite',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./securite/securite.component').then((m) => m.SecuriteComponent),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./table-history/table-history.component').then(
        (m) => m.TableHistoryComponent
      ),
  },
];

@NgModule({
  // Navigation initiale déclenchée à la main par AppComponent, une fois le
  // backend réveillé : sinon authGuard appellerait /auth/me sur un conteneur
  // endormi, échouerait, et redirigerait vers /login une session valide.
  imports: [RouterModule.forRoot(routes, { initialNavigation: 'disabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
