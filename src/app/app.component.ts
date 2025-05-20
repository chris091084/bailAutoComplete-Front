import { Component } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { FormDocComponent } from './form-doc/form-doc.component';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [FormDocComponent],
})
export class AppComponent {
  title = 'bailAutoComplet';
}
