import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BailDocComponent } from './bail-doc/bail-doc.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormDocComponent } from './form-doc/form-doc.component';

@NgModule({
  declarations: [AppComponent, BailDocComponent, FormDocComponent],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
