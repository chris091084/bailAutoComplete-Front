import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FormDocComponent } from './form-doc.component';

describe('FormDocComponent', () => {
  let component: FormDocComponent;
  let fixture: ComponentFixture<FormDocComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormDocComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FormDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Le constructeur appelle loadAppartements() : on absorbe la requete pour
  // que verify() ne la signale pas comme en attente.
  afterEach(() => {
    httpMock.match(() => true).forEach((request) => request.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dit ce qui manque plutot que de rester muet sur un formulaire incomplet', () => {
    component.onSubmit();

    expect(component.messageErreur).toContain('Nom');
    expect(component.isGenerating).toBe(false);
  });

  it('enregistre la saisie sans generer de document', () => {
    component.formDoc.patchValue({ name: 'Dupont' });

    component.onSave();

    const requete = httpMock.expectOne((r) => r.url.endsWith('/result-form'));
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body.name).toBe('Dupont');

    requete.flush({ id: 12 });
    expect(component.brouillonId).toBe(12);
    expect(component.messageSucces).toBeTruthy();
  });

  it('reenregistre une saisie reprise au lieu de la dupliquer', () => {
    component.brouillonId = 12;

    component.onSave();

    const requete = httpMock.expectOne((r) => r.url.endsWith('/result-form/12'));
    expect(requete.request.method).toBe('PUT');
    requete.flush({ id: 12 });
  });

  it("signale l'echec d'un enregistrement", () => {
    component.onSave();

    httpMock
      .expectOne((r) => r.url.endsWith('/result-form'))
      .flush({ message: 'Base indisponible' }, { status: 500, statusText: 'Server Error' });

    expect(component.messageErreur).toContain('Base indisponible');
    expect(component.isSaving).toBe(false);
  });
});
