import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { QuittanceService } from './quittance.service';

describe('QuittanceService', () => {
  let service: QuittanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(QuittanceService);
  });

  const options = (moisDebut: string, moisFin: string) => ({
    moisDebut,
    moisFin,
    datePaiement: '2026-01-05',
  });

  it('découpe la période en un mois par quittance', () => {
    expect(service.moisDeLaPeriode(options('2026-01', '2026-04'))).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });

  it('rend un seul mois quand début et fin se confondent', () => {
    expect(service.moisDeLaPeriode(options('2026-01', '2026-01'))).toEqual([
      '2026-01',
    ]);
  });

  it('franchit le changement d’année', () => {
    expect(service.moisDeLaPeriode(options('2025-11', '2026-02'))).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('rend une liste vide sur une période inversée', () => {
    expect(service.moisDeLaPeriode(options('2026-04', '2026-01'))).toEqual([]);
  });

  it('borne chaque quittance à son propre mois', () => {
    expect(service.debutPeriode('2026-02')).toBe('01/02/2026');
    // Février d'une année non bissextile : 28 jours, sans table de correspondance.
    expect(service.finPeriode('2026-02')).toBe('28/02/2026');
    expect(service.finPeriode('2024-02')).toBe('29/02/2024');
    expect(service.finPeriode('2026-04')).toBe('30/04/2026');
  });
});
