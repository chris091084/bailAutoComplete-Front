import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormDocComponent } from './form-doc/form-doc.component';
import { DateLeft } from './pipe/dateLeft.pipe';
import { NumberOfDays } from './pipe/numberOfDays.pipe';
import { NgxPrintModule } from 'ngx-print';
import { HttpClientModule } from '@angular/common/http';
import { ErrorMessagesComponent } from './error-messages/error-messages.component';

@NgModule({
  declarations: [
    AppComponent,
    FormDocComponent,
    DateLeft,
    NumberOfDays,
    ErrorMessagesComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    NgxPrintModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
