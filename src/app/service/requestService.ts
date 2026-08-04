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
      `${this.apiUrl}appartement`,
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

  getLocataires(): Observable<LocataireDto[]> {
    return this.http.get<LocataireDto[]>(`${this.apiUrl}locataire`);
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

  deleteLocataire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}locataire/${id}`);
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
}
