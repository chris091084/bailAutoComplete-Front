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
});
