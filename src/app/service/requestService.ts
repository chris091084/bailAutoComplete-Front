import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { SendMailPayload } from '../model/SendMail.model';
import { environment } from 'environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = `${environment.apiUrl}/`;
  constructor(private http: HttpClient) {}

  getAppartements(): Observable<AppartementDto[]> {
    return this.http.get<AppartementDto[]>(`${this.apiUrl}appartement`);
  }

  addAppartement(appartement: AppartementDto): Observable<AppartementDto> {
    return this.http.post<AppartementDto>(
      `${this.apiUrl}appartement`,
      appartement
    );
  }

  updateAppartement(appartement: AppartementDto): Observable<AppartementDto> {
    return this.http.put<AppartementDto>(
      `${this.apiUrl}appartement/${appartement.id}`,
      appartement
    );
  }

  deleteAppartement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}appartement/${id}`);
  }

  setRentRef(
    idAppartement?: string,
    fieldName?: string | null,
    value?: number | null
  ): Observable<any> {
    const body = {
      idAppartement,
      fieldName,
      value,
    };
    return this.http.post<any>(`${this.apiUrl}appartement/updateRent`, body);
  }

  setValIrlTirl(
    fieldName?: string | null,
    value?: string | null
  ): Observable<any> {
    const body = {
      fieldName,
      value,
    };
    return this.http.post<any>(
      `${this.apiUrl}appartement/updateValIrlTirl`,
      body
    );
  }

  /** `sortis` bascule sur les locataires ayant quitté le logement. */
  getLocataires(sortis = false): Observable<LocataireDto[]> {
    return this.http.get<LocataireDto[]>(`${this.apiUrl}locataire`, {
      params: { sortis },
    });
  }

  addLocataire(locataire: LocataireDto): Observable<LocataireDto> {
    return this.http.post<LocataireDto>(`${this.apiUrl}locataire`, locataire);
  }

  updateLocataire(locataire: LocataireDto): Observable<LocataireDto> {
    return this.http.put<LocataireDto>(
      `${this.apiUrl}locataire/${locataire.id}`,
      locataire
    );
  }

  /**
   * Sort un locataire du logement, à la place d'une suppression : la fiche
   * quitte la liste principale mais garde son bail et ses quittances.
   */
  marquerSortie(id: number, sortie: string): Observable<LocataireDto> {
    return this.http.post<LocataireDto>(
      `${this.apiUrl}locataire/${id}/sortie`,
      { sortie }
    );
  }

  /** Annule la sortie : le locataire revient dans la liste principale. */
  reintegrerLocataire(id: number): Observable<LocataireDto> {
    return this.http.delete<LocataireDto>(
      `${this.apiUrl}locataire/${id}/sortie`
    );
  }

  /** Horodate l'envoi de la lettre de congé, une fois le mail parti. */
  marquerResiliationEnvoyee(id: number): Observable<LocataireDto> {
    return this.http.post<LocataireDto>(
      `${this.apiUrl}locataire/${id}/resiliation`,
      {}
    );
  }

  getGenerations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}generation`);
  }

  saveGeneration(generation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}generation`, generation);
  }

  sendMail(payload: SendMailPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}mail/send`, payload);
  }

  /**
   * Convertit un document Word rempli en PDF. La conversion tourne sur l'API,
   * seule à disposer de LibreOffice ; le navigateur ne sait pas le faire.
   *
   * Le document part en `multipart/form-data` plutôt qu'en base64 : un `.docx`
   * pèse une dizaine de kilo-octets, autant ne pas l'enfler d'un tiers.
   */
  convertirEnPdf(docx: Blob, nomFichier: string): Observable<Blob> {
    const formulaire = new FormData();
    formulaire.append('document', docx, nomFichier);

    return this.http.post(`${this.apiUrl}documents/pdf`, formulaire, {
      responseType: 'blob',
    });
  }
}
