import type { Mock } from "vitest";
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from 'environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let auth: AuthService;
    // Mock partiel : l'intercepteur n'appelle que navigate().
    let router: { navigate: Mock };

    beforeEach(() => {
        router = {
            navigate: vi.fn().mockName("Router.navigate")
        };
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
            ],
        });
        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        auth = TestBed.inject(AuthService);
    });

    afterEach(() => httpMock.verify());

    it('laisse passer les assets locaux sans withCredentials', () => {
        http.get('assets/docx/bail.docx').subscribe();
        const req = httpMock.expectOne('assets/docx/bail.docx');
        expect(req.request.withCredentials).toBe(false);
        req.flush({});
    });

    it('pose withCredentials sur les requêtes API', () => {
        http.get(`${environment.apiUrl}/appartement`).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}/appartement`);
        expect(req.request.withCredentials).toBe(true);
        req.flush([]);
    });

    it('ne déclenche quun seul refresh pour deux 401 concurrents', () => {
        let okCount = 0;
        http.get(`${environment.apiUrl}/appartement`).subscribe(() => okCount++);
        http.get(`${environment.apiUrl}/generation`).subscribe(() => okCount++);

        httpMock
            .expectOne(`${environment.apiUrl}/appartement`)
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        httpMock
            .expectOne(`${environment.apiUrl}/generation`)
            .flush({}, { status: 401, statusText: 'Unauthorized' });

        // Un seul /auth/refresh doit partir malgré les deux 401.
        const refreshReqs = httpMock.match(`${environment.apiUrl}/auth/refresh`);
        expect(refreshReqs.length).toBe(1);
        refreshReqs[0]!.flush({ authenticated: true });

        // Les deux requêtes d'origine sont rejouées.
        httpMock.expectOne(`${environment.apiUrl}/appartement`).flush([]);
        httpMock.expectOne(`${environment.apiUrl}/generation`).flush([]);
        expect(okCount).toBe(2);
        expect(auth.isAuthenticated()).toBe(true);
    });

    it('déconnecte et redirige si le refresh échoue', () => {
        auth.setAuthenticated(true);
        let failed = false;
        http.get(`${environment.apiUrl}/appartement`).subscribe({
            error: () => (failed = true),
        });

        httpMock
            .expectOne(`${environment.apiUrl}/appartement`)
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        httpMock
            .expectOne(`${environment.apiUrl}/auth/refresh`)
            .flush({ message: 'Session expirée, reconnexion requise' }, { status: 401, statusText: 'Unauthorized' });

        expect(failed).toBe(true);
        expect(auth.isAuthenticated()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('ne rejoue jamais un 401 venant de /auth/login', () => {
        auth.login('motdepasse').subscribe({ error: () => undefined });
        httpMock
            .expectOne(`${environment.apiUrl}/auth/login`)
            .flush({ message: 'Mot de passe incorrect' }, { status: 401, statusText: 'Unauthorized' });
        httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
    });

    it('ne rejoue pas la requête une deuxième fois si le retry échoue', () => {
        let status = 0;
        http.get(`${environment.apiUrl}/appartement`).subscribe({
            error: (e: {
                status: number;
            }) => (status = e.status),
        });

        httpMock
            .expectOne(`${environment.apiUrl}/appartement`)
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        httpMock
            .expectOne(`${environment.apiUrl}/auth/refresh`)
            .flush({ authenticated: true });
        httpMock
            .expectOne(`${environment.apiUrl}/appartement`)
            .flush({}, { status: 401, statusText: 'Unauthorized' });

        httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
        expect(status).toBe(401);
    });
});
