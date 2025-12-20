import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormDocComponent } from './form-doc/form-doc.component';
import { TableComponent } from './table/table.component';
import { HistoryComponent } from './history/history.component';

const routes: Routes = [
  { path: '', component: FormDocComponent },
  { path: 'table', component: TableComponent },
  { path: 'history', component: HistoryComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
