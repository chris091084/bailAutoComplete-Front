import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormDocComponent } from './form-doc/form-doc.component';
import { TableComponent } from './table/table.component';

const routes: Routes = [
  { path: '', component: FormDocComponent },
  { path: 'table', component: TableComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
