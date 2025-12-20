import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appartement } from '../model/appartement.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';

import { ResultForm } from '../model/resultForm.model';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = '/api/';
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

  saveLeaseRequest(resultForm: ResultForm): Observable<ResultForm> {
    return this.http.post<ResultForm>(
      `${this.apiUrl}lease-request`,
      resultForm
    );
  }

  getLeaseRequests(): Observable<ResultForm[]> {
    return this.http.get<ResultForm[]>(`${this.apiUrl}lease-request`);
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
