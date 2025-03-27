import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appartement } from '../model/appartement.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = 'http://localhost:8080/';
  constructor(private http: HttpClient) {}

  getAppartements(): Observable<AppartementDto> {
    return this.http.get<AppartementDto>(`${this.apiUrl}appartement`);
  }

  setRentRef(
    idAppartement?: string,
    rentRef?: number | null,
    rentRefMaj?: number | null
  ): Observable<any> {
    const body = {
      idAppartement,
      rentRef,
      rentRefMaj,
    };
    return this.http.post<any>(`${this.apiUrl}appartement/updateRent`, body);
  }
}
