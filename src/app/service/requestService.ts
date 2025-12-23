import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';
import { environment } from 'environments/environment';

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
}
