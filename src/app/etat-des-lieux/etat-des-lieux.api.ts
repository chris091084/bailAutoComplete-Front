import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';
import { PUBLIC_REQUEST } from '../service/public-request';
import {
  ElementDto,
  EtatDesLieuxDto,
  ModificationElement,
  PhotoDto,
  ResultatSignature,
  StatutEtatDesLieux,
} from './etat-des-lieux.model';

/**
 * Appels de l'API côté locataire. Toutes les routes s'authentifient par le
 * jeton placé dans l'URL : d'où le contexte `PUBLIC_REQUEST`, qui écarte la
 * logique de session du bailleur.
 */
@Injectable({ providedIn: 'root' })
export class EtatDesLieuxApi {
  private readonly http = inject(HttpClient);
  private readonly contexte = new HttpContext().set(PUBLIC_REQUEST, true);

  private url(token: string, suite = ''): string {
    return `${environment.apiUrl}/etats-des-lieux/${token}${suite}`;
  }

  lire(token: string): Observable<EtatDesLieuxDto> {
    return this.http.get<EtatDesLieuxDto>(this.url(token), {
      context: this.contexte,
    });
  }

  modifierElement(
    token: string,
    elementId: string,
    modification: ModificationElement,
  ): Observable<ElementDto> {
    return this.http.patch<ElementDto>(
      this.url(token, `/elements/${elementId}`),
      modification,
      { context: this.contexte },
    );
  }

  /**
   * Envoie une photo (multipart). `id` est choisi par l'appareil : rejouer
   * l'envoi après une coupure retombe sur la même photo, sans doublon.
   */
  envoyerPhoto(
    token: string,
    elementId: string,
    photoId: string,
    fichier: Blob,
  ): Observable<PhotoDto> {
    const formulaire = new FormData();
    formulaire.append('id', photoId);
    formulaire.append('photo', fichier, `${photoId}.jpg`);

    return this.http.post<PhotoDto>(
      this.url(token, `/elements/${elementId}/photos`),
      formulaire,
      { context: this.contexte },
    );
  }

  supprimerPhoto(token: string, photoId: string): Observable<void> {
    return this.http.delete<void>(this.url(token, `/photos/${photoId}`), {
      context: this.contexte,
    });
  }

  /** Adresse d'une image servie par l'API (pour une balise `<img>`). */
  urlPhoto(token: string, photoId: string): string {
    return this.url(token, `/photos/${photoId}`);
  }

  /** Validation globale : tous les éléments traités, sinon 422 avec la liste des manquants. */
  valider(token: string): Observable<{ statut: StatutEtatDesLieux }> {
    return this.http.post<{ statut: StatutEtatDesLieux }>(this.url(token, '/validate'), null, {
      context: this.contexte,
    });
  }

  /** Signature (PNG en URL de données) : verrouille le document, puis PDF + e-mails. */
  signer(token: string, signatureLocataire: string): Observable<ResultatSignature> {
    return this.http.post<ResultatSignature>(
      this.url(token, '/sign'),
      { signatureLocataire },
      { context: this.contexte },
    );
  }
}
