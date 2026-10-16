import { signal } from '@angular/core';

import { DocumentLocal, EcritureLocale } from './ecriture-locale';
import { EtatDesLieuxStockage } from './etat-des-lieux-stockage';
import { PhotoLocale } from './photo-locale';

/**
 * Stockage en mémoire pour les tests, avec le journal des appels : il permet de
 * vérifier l'ORDRE (« d'abord l'appareil, ensuite l'API »).
 */
export class StockageMemoire extends EtatDesLieuxStockage {
  readonly persistant = signal(true);
  readonly documents = new Map<string, DocumentLocal>();
  readonly ecritures = new Map<string, EcritureLocale>();
  readonly journal: string[] = [];

  async lireDocument(docId: string): Promise<DocumentLocal | undefined> {
    return this.documents.get(docId);
  }

  async sauverDocument(document: DocumentLocal): Promise<void> {
    this.documents.set(document.docId, document);
  }

  async listerEcritures(docId: string): Promise<EcritureLocale[]> {
    return [...this.ecritures.values()].filter((e) => e.docId === docId);
  }

  async sauverEcriture(ecriture: EcritureLocale): Promise<void> {
    this.journal.push('stockage:sauver');
    this.ecritures.set(ecriture.cle, ecriture);
  }

  async supprimerEcriture(cle: string, seq?: number): Promise<void> {
    this.journal.push('stockage:supprimer');
    const actuelle = this.ecritures.get(cle);
    if (actuelle && (seq === undefined || actuelle.seq === seq)) {
      this.ecritures.delete(cle);
    }
  }

  readonly photos = new Map<string, PhotoLocale>();

  async listerPhotos(docId: string): Promise<PhotoLocale[]> {
    return [...this.photos.values()].filter((p) => p.docId === docId);
  }

  async sauverPhoto(photo: PhotoLocale): Promise<void> {
    this.journal.push('stockage:photo');
    this.photos.set(photo.id, photo);
  }

  async supprimerPhoto(id: string): Promise<void> {
    this.photos.delete(id);
  }

  async purgerDocument(docId: string): Promise<void> {
    this.journal.push('stockage:purge');
    this.documents.delete(docId);
    for (const [cle, e] of this.ecritures) if (e.docId === docId) this.ecritures.delete(cle);
    for (const [id, p] of this.photos) if (p.docId === docId) this.photos.delete(id);
  }
}
