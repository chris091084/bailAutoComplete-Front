import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';

export type TypeEdl = 'entree' | 'sortie';
export type StatutEdl = 'draft' | 'validated' | 'signed';

/** Une ligne de la liste du bailleur. */
export interface ResumeEtatDesLieux {
  id: string;
  type: TypeEdl;
  statut: StatutEdl;
  locataireId: number;
  appartementId: number;
  dateCreation: string;
  dateSignature: string | null;
  elementsValides: number;
  elementsTotal: number;
}

/** Lien à transmettre au locataire. */
export interface LienEtatDesLieux {
  id: string;
  lien: string;
  expireLe: string;
}

export interface SuitesEnvoi {
  pdf: boolean;
  emailLocataire: boolean;
  emailBailleur: boolean;
  archive: boolean;
}

/** Appels de l'API côté BAILLEUR (session requise) : créer, envoyer, rouvrir, télécharger. */
@Injectable({ providedIn: 'root' })
export class EtatsDesLieuxAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/etats-des-lieux`;

  lister(): Observable<ResumeEtatDesLieux[]> {
    return this.http.get<ResumeEtatDesLieux[]>(this.base);
  }

  creer(locataireId: number, type: TypeEdl): Observable<LienEtatDesLieux> {
    return this.http.post<LienEtatDesLieux>(this.base, { locataireId, type });
  }

  /** Nouveau lien : l'ancien cesse de fonctionner. */
  regenererLien(id: string): Observable<LienEtatDesLieux> {
    return this.http.post<LienEtatDesLieux>(`${this.base}/${id}/lien`, null);
  }

  envoyerLien(id: string): Observable<{ envoyeA: string }> {
    return this.http.post<{ envoyeA: string }>(`${this.base}/${id}/envoyer-lien`, null);
  }

  rouvrir(id: string): Observable<{ statut: StatutEdl }> {
    return this.http.post<{ statut: StatutEdl }>(`${this.base}/${id}/reouvrir`, null);
  }

  renvoyer(id: string): Observable<SuitesEnvoi> {
    return this.http.post<SuitesEnvoi>(`${this.base}/${id}/renvoyer`, null);
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }
}
