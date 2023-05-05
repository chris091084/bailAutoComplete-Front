import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BailDocComponent } from './bail-doc/bail-doc.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormDocComponent } from './form-doc/form-doc.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DateLeft } from './pipe/dateLeft.pipe';
import { NumberOfDays } from './pipe/numberOfDays.pipe';
import { NgxPrintModule } from 'ngx-print';

@NgModule({
  declarations: [
    AppComponent,
    BailDocComponent,
    FormDocComponent,
    DateLeft,
    NumberOfDays,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    NgbModule,
    NgxPrintModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
