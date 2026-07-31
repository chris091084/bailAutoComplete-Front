import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormDocComponent } from './form-doc/form-doc.component';
import { TableComponent } from './table/table.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './guard/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: FormDocComponent, canActivate: [authGuard] },
  { path: 'table', component: TableComponent, canActivate: [authGuard] },
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
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
