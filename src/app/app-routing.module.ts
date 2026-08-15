import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormDocComponent } from './form-doc/form-doc.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './guard/auth.guard';
import { AppartementComponent } from './appartement/appartement.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
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
