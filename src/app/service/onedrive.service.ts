import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';

/** Miroir de `StatutOneDrive` côté API. */
export interface StatutOneDrive {
  /** Les variables d'environnement du serveur sont posées. */
  configure: boolean;
  connecte: boolean;
  /** Connecté un jour, mais Microsoft a retiré l'accès : reconnexion nécessaire. */
  revoque: boolean;
  connecteLe: string | null;
}

/** Connexion du OneDrive du bailleur, pour le stockage des photos. */
@Injectable({ providedIn: 'root' })
export class OnedriveService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/onedrive`;

  statut(): Observable<StatutOneDrive> {
    return this.http.get<StatutOneDrive>(`${this.base}/statut`);
  }

  /** Adresse de la page de consentement Microsoft, où envoyer le navigateur. */
  urlAutorisation(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/autorisation`);
  }

  deconnecter(): Observable<void> {
    return this.http.delete<void>(`${this.base}/connexion`);
  }
}
