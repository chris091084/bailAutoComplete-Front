import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appartement } from '../model/appartement.model';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root', // Fournit ce service à toute l'application
})
export class RequestService {
  private apiUrl = 'http://localhost:8080/'; // URL de ton backend Spring Boot

  constructor(private http: HttpClient) {}

  getAppartements(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}appartement`);
  }

  setRentRef(
    idAppartement?: string,
    rentRef?: number,
    rentRefMaj?: number
  ): Observable<any> {
    const body = {
      idAppartement,
      rentRef,
      rentRefMaj,
    };
    return this.http.post<any>(`${this.apiUrl}appartement/updateRent`, body);
  }
}
