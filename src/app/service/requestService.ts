import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appartement } from '../model/appartement.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root', // Fournit ce service à toute l'application
})
export class RequestService {
  private apiUrl = 'http://localhost:8080/'; // URL de ton backend Spring Boot

  constructor(private http: HttpClient) {}

  getAppartements(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}appartement`);
  }
}
