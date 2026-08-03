import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { environment } from 'environments/environment';
import { AppComponent } from './app.component';
import { AuthService } from './service/auth.service';
import { ReadinessResponse } from './service/backend-readiness.service';

const READINESS_URL = `${environment.apiUrl}/actuator/health/readiness`;

/** Doivent refléter les constantes privées d'AppComponent. */
const SPLASH_DELAY_MS = 400;
const SPLASH_FADE_MS = 300;
/** Doit refléter RETRY_DELAY_MS du BackendReadinessService. */
const RETRY_DELAY_MS = 2000;

const UP: ReadinessResponse = { status: 'UP', database: 'UP', uptimeMs: 12_000 };
const STARTING: ReadinessResponse = {
  status: 'STARTING',
  database: 'DOWN',
  uptimeMs: 300,
};

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let httpMock: HttpTestingController;
  let restoreSession: jasmine.Spy<() => Observable<boolean>>;

  beforeEach(async () => {
    restoreSession = jasmine
      .createSpy<() => Observable<boolean>>('restoreSession')
      .and.returnValue(of(true));

    const authStub: Pick<
      AuthService,
      'isAuthenticated' | 'restoreSession' | 'logout'
    > = {
      isAuthenticated: signal(false).asReadonly(),
      restoreSession,
      logout: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    // La navigation initiale est déclenchée à la main par AppComponent : sans
    // route déclarée ici, la laisser partir ferait échouer le test pour une
    // raison sans rapport avec ce qu'il vérifie.
    spyOn(TestBed.inject(Router), 'initialNavigation');
    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  function splash(): HTMLElement | null {
    return fixture.nativeElement.querySelector('app-splash');
  }

  function navbar(): HTMLElement | null {
    return fixture.nativeElement.querySelector('nav.navbar');
  }

  it("n'affiche pas le splash si le backend répond immédiatement", fakeAsync(() => {
    fixture.detectChanges();

    httpMock.expectOne(READINESS_URL).flush(UP);
    tick();
    fixture.detectChanges();

    expect(restoreSession).toHaveBeenCalled();
    expect(splash()).toBeNull();
    expect(navbar()).not.toBeNull();

    // La minuterie anti-flash expire ensuite sans rien afficher.
    tick(SPLASH_DELAY_MS + SPLASH_FADE_MS);
    fixture.detectChanges();
    expect(splash()).toBeNull();
  }));

  it('affiche le splash sur un 503 puis le retire après le 200', fakeAsync(() => {
    fixture.detectChanges();

    httpMock
      .expectOne(READINESS_URL)
      .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });

    tick(SPLASH_DELAY_MS);
    fixture.detectChanges();
    expect(splash()).not.toBeNull();
    expect(navbar()).toBeNull();
    // Inutile de relire la session tant que le conteneur démarre.
    expect(restoreSession).not.toHaveBeenCalled();

    tick(RETRY_DELAY_MS - SPLASH_DELAY_MS);
    httpMock.expectOne(READINESS_URL).flush(UP);
    tick();
    fixture.detectChanges();

    expect(restoreSession).toHaveBeenCalled();
    // Le splash reste monté le temps du fondu de sortie.
    expect(splash()).not.toBeNull();

    tick(SPLASH_FADE_MS);
    fixture.detectChanges();
    expect(splash()).toBeNull();
    expect(navbar()).not.toBeNull();

    discardPeriodicTasks();
  }));

  it('réessaie après une erreur réseau sans afficher d’erreur définitive', fakeAsync(() => {
    fixture.detectChanges();

    httpMock.expectOne(READINESS_URL).error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    tick(SPLASH_DELAY_MS);
    fixture.detectChanges();
    expect(splash()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.alert-danger')).toBeNull();

    // Une nouvelle sonde part malgré l'échec : rien n'est abandonné.
    tick(RETRY_DELAY_MS - SPLASH_DELAY_MS);
    httpMock.expectOne(READINESS_URL).flush(UP);
    tick(SPLASH_FADE_MS);
    fixture.detectChanges();

    expect(splash()).toBeNull();
    expect(restoreSession).toHaveBeenCalled();

    discardPeriodicTasks();
  }));

  it("a pour titre 'bailAutoComplet'", () => {
    expect(fixture.componentInstance.title).toEqual('bailAutoComplet');
  });
});
