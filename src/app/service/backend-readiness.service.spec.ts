import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';

import { environment } from 'environments/environment';
import {
  BackendReadinessService,
  ReadinessResponse,
} from './backend-readiness.service';

const READINESS_URL = `${environment.apiUrl}/actuator/health/readiness`;

const UP: ReadinessResponse = { status: 'UP', database: 'UP', uptimeMs: 12_000 };
const STARTING: ReadinessResponse = {
  status: 'STARTING',
  database: 'DOWN',
  uptimeMs: 300,
};

describe('BackendReadinessService', () => {
  let service: BackendReadinessService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BackendReadinessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('complète dès le premier 200 et pousse la barre à 100 %', fakeAsync(() => {
    let completed = false;
    service.waitForBackend().subscribe({ complete: () => (completed = true) });

    httpMock.expectOne(READINESS_URL).flush(UP);
    tick();

    expect(completed).toBeTrue();
    expect(service.isReady()).toBeTrue();
    expect(service.progress()).toBe(100);
  }));

  it('resonde toutes les 2 s tant que la réponse est un 503', fakeAsync(() => {
    service.waitForBackend().subscribe();

    httpMock
      .expectOne(READINESS_URL)
      .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });
    expect(service.isReady()).toBeFalse();

    // Rien ne repart avant l'expiration du délai.
    tick(1999);
    httpMock.expectNone(READINESS_URL);

    tick(1);
    httpMock
      .expectOne(READINESS_URL)
      .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });

    tick(2000);
    httpMock.expectOne(READINESS_URL).flush(UP);
    tick();

    expect(service.isReady()).toBeTrue();
    discardPeriodicTasks();
  }));

  it('abandonne une requête sans réponse au bout de 10 s et en relance une', fakeAsync(() => {
    service.waitForBackend().subscribe();

    const stalled = httpMock.expectOne(READINESS_URL);
    tick(10_000);
    expect(stalled.cancelled).toBeTrue();

    tick(2000);
    httpMock.expectOne(READINESS_URL).flush(UP);
    tick();

    expect(service.isReady()).toBeTrue();
    discardPeriodicTasks();
  }));

  it('plafonne la barre à 90 % et signale la lenteur après 15 s', fakeAsync(() => {
    service.waitForBackend().subscribe();

    httpMock
      .expectOne(READINESS_URL)
      .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });

    tick(10_000);
    expect(service.isSlow()).toBeFalse();
    expect(service.progress()).toBe(45);

    tick(5000);
    expect(service.isSlow()).toBeTrue();

    // La barre ne dépasse jamais 90 % avant le 200, même très longtemps après.
    tick(30_000);
    expect(service.progress()).toBe(90);

    httpMock.match(READINESS_URL).forEach((request) => {
      if (!request.cancelled) {
        request.flush(STARTING, { status: 503, statusText: 'Service Unavailable' });
      }
    });
    discardPeriodicTasks();
  }));
});
