import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { DateLeft } from './pipe/dateLeft.pipe';
import { NumberOfDays } from './pipe/numberOfDays.pipe';

import { ErrorMessagesComponent } from './error-messages/error-messages.component';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPrintModule } from 'ngx-print';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [DateLeft, NumberOfDays],
  imports: [
    AppRoutingModule,
    ReactiveFormsModule,
    NgxPrintModule,
    HttpClientModule,
  ],
  providers: [],
})
export class AppModule {}
