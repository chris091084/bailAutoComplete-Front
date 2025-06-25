import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appartement } from '../model/appartement.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = '/api/';
  constructor(private http: HttpClient) {}

  getAppartements(): Observable<AppartementDto> {
    return this.http.get<AppartementDto>(`${this.apiUrl}appartement`);
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
}
