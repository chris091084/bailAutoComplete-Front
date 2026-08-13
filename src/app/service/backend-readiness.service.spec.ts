import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'environments/environment';
import { BackendReadinessService, ReadinessResponse, } from './backend-readiness.service';

const READINESS_URL = `${environment.apiUrl}/actuator/health/readiness`;

const UP: ReadinessResponse = { status: 'UP', database: 'UP', uptimeMs: 12000 };
const STARTING: ReadinessResponse = {
    status: 'STARTING',
    database: 'DOWN',
    uptimeMs: 300,
};

describe('BackendReadinessService', () => {
    beforeEach(() => {
        // Horloge entierement manuelle : `shouldAdvanceTime` la ferait avancer
        // toute seule et le retry de 2 s partirait avant les assertions.
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let service: BackendReadinessService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });
        service = TestBed.inject(BackendReadinessService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify({ ignoreCancelled: true }));

    it('complète dès le premier 200 et pousse la barre à 100 %', async () => {
        let completed = false;
        service.waitForBackend().subscribe({ complete: () => (completed = true) });

        httpMock.expectOne(READINESS_URL).flush(UP);
        await vi.advanceTimersByTimeAsync(0);

        expect(completed).toBe(true);
        expect(service.isReady()).toBe(true);
        expect(service.progress()).toBe(100);
    });

    it('resonde toutes les 2 s tant que la réponse est un 503', async () => {
        service.waitForBackend().subscribe();

        httpMock
            .expectOne(READINESS_URL)
            .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });
        expect(service.isReady()).toBe(false);

        // Rien ne repart avant l'expiration du délai.
        await vi.advanceTimersByTimeAsync(1999);
        httpMock.expectNone(READINESS_URL);

        await vi.advanceTimersByTimeAsync(1);
        httpMock
            .expectOne(READINESS_URL)
            .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });

        await vi.advanceTimersByTimeAsync(2000);
        httpMock.expectOne(READINESS_URL).flush(UP);
        await vi.advanceTimersByTimeAsync(0);

        expect(service.isReady()).toBe(true);
        vi.clearAllTimers();
    });

    it('abandonne une requête sans réponse au bout de 10 s et en relance une', async () => {
        service.waitForBackend().subscribe();

        const stalled = httpMock.expectOne(READINESS_URL);
        await vi.advanceTimersByTimeAsync(10000);
        expect(stalled.cancelled).toBe(true);

        await vi.advanceTimersByTimeAsync(2000);
        httpMock.expectOne(READINESS_URL).flush(UP);
        await vi.advanceTimersByTimeAsync(0);

        expect(service.isReady()).toBe(true);
        vi.clearAllTimers();
    });

    it('plafonne la barre à 90 % et signale la lenteur après 15 s', async () => {
        service.waitForBackend().subscribe();

        httpMock
            .expectOne(READINESS_URL)
            .flush(STARTING, { status: 503, statusText: 'Service Unavailable' });

        await vi.advanceTimersByTimeAsync(10000);
        expect(service.isSlow()).toBe(false);
        expect(service.progress()).toBe(45);

        await vi.advanceTimersByTimeAsync(5000);
        expect(service.isSlow()).toBe(true);

        // La barre ne dépasse jamais 90 % avant le 200, même très longtemps après.
        await vi.advanceTimersByTimeAsync(30000);
        expect(service.progress()).toBe(90);

        httpMock.match(READINESS_URL).forEach((request) => {
            if (!request.cancelled) {
                request.flush(STARTING, { status: 503, statusText: 'Service Unavailable' });
            }
        });
        vi.clearAllTimers();
    });
});
