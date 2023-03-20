import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BailDocComponent } from './bail-doc/bail-doc.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormDocComponent } from './form-doc/form-doc.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DateLeft } from './pipe/dateLeft.pipe';

@NgModule({
  declarations: [AppComponent, BailDocComponent, FormDocComponent, DateLeft],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule, NgbModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
