import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { readFile } from 'node:fs/promises';
import { firstValueFrom } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { QuittanceService } from './quittance.service';

describe('QuittanceService', () => {
  let service: QuittanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(QuittanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Laisse la chaîne de promesses du service avancer d'un cran. */
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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

  it('remplit le modèle Word par mois et fait convertir chacun en PDF', async () => {
    // Le vrai modèle : docxtemplater refuserait un contenu inventé, et c'est
    // précisément le remplissage du document du bailleur qu'on veut couvrir.
    // Lu sur le disque : sous Vitest il n'y a pas de serveur de fichiers, et
    // `fetch` en environnement Node refuse une URL relative. On recopie dans
    // un ArrayBuffer du realm de test, sinon le Buffer de Node echoue au
    // `instanceof` du backend HTTP de test.
    const octets = await readFile('src/assets/docx/Quittance_de_loyer.docx');
    const modele = new ArrayBuffer(octets.byteLength);
    new Uint8Array(modele).set(octets);

    const locataire = {
      nom: 'DUPONT',
      prenom: 'Marie',
      loyerHorsCharges: 550,
      charges: 45,
    } as LocataireDto;
    const appartement = {
      adress: '12 rue des Lilas, 44000 Nantes',
      bailleur: { name: 'S. BODIN', adress: '3 place du Marché, 44100 Nantes' },
    } as AppartementDto;

    const promesse = firstValueFrom(
      service.genererQuittances(
        locataire,
        appartement,
        options('2026-01', '2026-03'),
      ),
    );

    http.expectOne('assets/docx/Quittance_de_loyer.docx').flush(modele);
    await tick();

    // Une conversion à la fois : la suivante n'est demandée qu'une fois la
    // précédente rendue.
    for (const mois of ['2026-01', '2026-02', '2026-03']) {
      const requete = http.expectOne((r) =>
        r.url.endsWith('documents/pdf'),
      );
      const envoye = (requete.request.body as FormData).get(
        'document',
      ) as File;

      expect(envoye.name).toBe(`Quittance_${mois}_DUPONT_Marie.pdf`);
      expect(envoye.size).toBeGreaterThan(0);

      requete.flush(
        new Blob(['%PDF-1.7 …'], { type: 'application/pdf' }),
      );
      await tick();
    }

    const quittances = await promesse;

    expect(quittances.map((q) => q.nomFichier)).toEqual([
      'Quittance_2026-01_DUPONT_Marie.pdf',
      'Quittance_2026-02_DUPONT_Marie.pdf',
      'Quittance_2026-03_DUPONT_Marie.pdf',
    ]);
    quittances.forEach((quittance) => {
      expect(quittance.fichier.type).toBe('application/pdf');
    });
  });

  it('borne chaque quittance à son propre mois', () => {
    expect(service.debutPeriode('2026-02')).toBe('01/02/2026');
    // Février d'une année non bissextile : 28 jours, sans table de correspondance.
    expect(service.finPeriode('2026-02')).toBe('28/02/2026');
    expect(service.finPeriode('2024-02')).toBe('29/02/2024');
    expect(service.finPeriode('2026-04')).toBe('30/04/2026');
  });
});
