/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { importProvidersFrom, provideZoneChangeDetection } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { NgxPrintModule } from 'ngx-print';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

import { authInterceptor } from './app/service/auth.interceptor';

// La réhydratation de session n'est plus un APP_INITIALIZER : le backend est
// hébergé en scale-to-zero, et bloquer le bootstrap laisserait l'utilisateur
// devant une page blanche pendant le réveil du conteneur. AppComponent attend
// d'abord la sonde de démarrage (splash à l'écran), puis appelle
// restoreSession() et déclenche la navigation initiale.
bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    importProvidersFrom(AppRoutingModule, ReactiveFormsModule, NgxPrintModule),
  ],
}).catch((err) => console.error(err));
