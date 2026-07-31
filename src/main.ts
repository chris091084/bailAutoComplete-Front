/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { APP_INITIALIZER, importProvidersFrom, inject } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { NgxPrintModule } from 'ngx-print';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from './app/service/auth.interceptor';
import { AuthService } from './app/service/auth.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(AppRoutingModule, ReactiveFormsModule, NgxPrintModule),
    {
      // Réhydratation : les cookies httpOnly survivent au rechargement, mais le
      // front ne le sait qu'après avoir interrogé l'API. On attend la réponse
      // avant la première navigation pour éviter un flash de l'écran de login.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthService);
        return () => firstValueFrom(auth.restoreSession());
      },
    },
  ],
}).catch((err) => console.error(err));
