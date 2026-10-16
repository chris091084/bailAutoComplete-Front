import { Injectable, signal } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { DocumentLocal, EcritureLocale } from './ecriture-locale';
import { PhotoLocale } from './photo-locale';

/**
 * Ce que la page garde sur l'appareil. Une classe abstraite sert de « prise »
 * (jeton d'injection) : l'application branche IndexedDB, les tests branchent
 * une version en mémoire.
 */
export abstract class EtatDesLieuxStockage {
  /** Faux quand IndexedDB est inutilisable (navigation privée, quota…). */
  abstract readonly persistant: ReturnType<typeof signal<boolean>>;
  abstract lireDocument(docId: string): Promise<DocumentLocal | undefined>;
  abstract sauverDocument(document: DocumentLocal): Promise<void>;
  abstract listerEcritures(docId: string): Promise<EcritureLocale[]>;
  abstract sauverEcriture(ecriture: EcritureLocale): Promise<void>;
  /**
   * Supprime l'écriture. Avec `seq`, seulement si le compteur n'a pas changé :
   * une saisie plus récente faite pendant l'envoi est conservée.
   */
  abstract supprimerEcriture(cle: string, seq?: number): Promise<void>;
  abstract listerPhotos(docId: string): Promise<PhotoLocale[]>;
  abstract sauverPhoto(photo: PhotoLocale): Promise<void>;
  abstract supprimerPhoto(id: string): Promise<void>;
  /** Efface tout ce que l'appareil garde d'un document (une fois signé : plus aucune utilité). */
  abstract purgerDocument(docId: string): Promise<void>;
}

interface EdlDb extends DBSchema {
  documents: { key: string; value: DocumentLocal };
  photos: {
    key: string;
    value: PhotoLocale;
    indexes: { 'par-document': string };
  };
  ecritures: {
    key: string;
    value: EcritureLocale;
    indexes: { 'par-document': string };
  };
}

export const NOM_BASE = 'bail-auto-edl';
/** v1 : documents + écritures. v2 : + photos. */
export const VERSION_BASE = 2;

/**
 * IndexedDB via `idb`. Si la base ne s'ouvre pas, on retombe sur la mémoire de
 * l'onglet : la page reste utilisable, seule la reprise après fermeture est
 * perdue — et `persistant` passe à faux pour que l'écran le dise.
 */
@Injectable({ providedIn: 'root' })
export class IdbEtatDesLieuxStockage extends EtatDesLieuxStockage {
  readonly persistant = signal(true);

  private base: Promise<IDBPDatabase<EdlDb> | null> | null = null;
  private readonly memoireDocuments = new Map<string, DocumentLocal>();
  private readonly memoireEcritures = new Map<string, EcritureLocale>();
  private readonly memoirePhotos = new Map<string, PhotoLocale>();

  private ouvrir(): Promise<IDBPDatabase<EdlDb> | null> {
    // `async` pour attraper AUSSI les erreurs levées sur le coup : en navigation
    // privée, certains navigateurs font échouer `indexedDB.open` sans promesse.
    this.base ??= (async () => {
      try {
        return await openDB<EdlDb>(NOM_BASE, VERSION_BASE, {
          // `oldVersion` : ce que l'appareil a déjà (0 = base neuve). On ne crée
          // que ce qui manque, pour qu'une base v1 existante monte en v2 sans perte.
          upgrade(db, oldVersion) {
            if (oldVersion < 1) {
              db.createObjectStore('documents', { keyPath: 'docId' });
              const ecritures = db.createObjectStore('ecritures', {
                keyPath: 'cle',
              });
              ecritures.createIndex('par-document', 'docId');
            }
            if (oldVersion < 2) {
              const photos = db.createObjectStore('photos', { keyPath: 'id' });
              photos.createIndex('par-document', 'docId');
            }
          },
        });
      } catch {
        this.persistant.set(false);
        return null;
      }
    })();
    return this.base;
  }

  /** Exécute sur IndexedDB ; à la moindre erreur, bascule en mémoire. */
  private async avec<T>(
    surBase: (db: IDBPDatabase<EdlDb>) => Promise<T>,
    surMemoire: () => T,
  ): Promise<T> {
    const db = await this.ouvrir();
    if (db === null) {
      return surMemoire();
    }
    try {
      return await surBase(db);
    } catch {
      this.persistant.set(false);
      return surMemoire();
    }
  }

  lireDocument(docId: string): Promise<DocumentLocal | undefined> {
    return this.avec(
      (db) => db.get('documents', docId),
      () => this.memoireDocuments.get(docId),
    );
  }

  async sauverDocument(document: DocumentLocal): Promise<void> {
    this.memoireDocuments.set(document.docId, document);
    await this.avec(
      (db) => db.put('documents', document).then(() => undefined),
      () => undefined,
    );
  }

  listerEcritures(docId: string): Promise<EcritureLocale[]> {
    return this.avec(
      (db) => db.getAllFromIndex('ecritures', 'par-document', docId),
      () =>
        [...this.memoireEcritures.values()].filter((e) => e.docId === docId),
    );
  }

  async sauverEcriture(ecriture: EcritureLocale): Promise<void> {
    this.memoireEcritures.set(ecriture.cle, ecriture);
    await this.avec(
      (db) => db.put('ecritures', ecriture).then(() => undefined),
      () => undefined,
    );
  }

  async supprimerEcriture(cle: string, seq?: number): Promise<void> {
    const enMemoire = this.memoireEcritures.get(cle);
    if (seq === undefined || enMemoire?.seq === seq) {
      this.memoireEcritures.delete(cle);
    }

    await this.avec(
      async (db) => {
        // Lecture + suppression dans UNE transaction : pas de saisie qui
        // s'intercale entre le contrôle du compteur et l'effacement.
        const transaction = db.transaction('ecritures', 'readwrite');
        const actuelle = await transaction.store.get(cle);
        if (actuelle && (seq === undefined || actuelle.seq === seq)) {
          await transaction.store.delete(cle);
        }
        await transaction.done;
      },
      () => undefined,
    );
  }

  listerPhotos(docId: string): Promise<PhotoLocale[]> {
    return this.avec(
      (db) => db.getAllFromIndex('photos', 'par-document', docId),
      () => [...this.memoirePhotos.values()].filter((p) => p.docId === docId),
    );
  }

  async sauverPhoto(photo: PhotoLocale): Promise<void> {
    this.memoirePhotos.set(photo.id, photo);
    await this.avec(
      (db) => db.put('photos', photo).then(() => undefined),
      () => undefined,
    );
  }

  async supprimerPhoto(id: string): Promise<void> {
    this.memoirePhotos.delete(id);
    await this.avec(
      (db) => db.delete('photos', id),
      () => undefined,
    );
  }

  async purgerDocument(docId: string): Promise<void> {
    for (const [cle, e] of this.memoireEcritures) {
      if (e.docId === docId) this.memoireEcritures.delete(cle);
    }
    for (const [id, p] of this.memoirePhotos) {
      if (p.docId === docId) this.memoirePhotos.delete(id);
    }
    this.memoireDocuments.delete(docId);

    await this.avec(
      async (db) => {
        const transaction = db.transaction(
          ['documents', 'ecritures', 'photos'],
          'readwrite',
        );
        await transaction.objectStore('documents').delete(docId);
        for (const nom of ['ecritures', 'photos'] as const) {
          const magasin = transaction.objectStore(nom);
          for (const cle of await magasin.index('par-document').getAllKeys(docId)) {
            await magasin.delete(cle);
          }
        }
        await transaction.done;
      },
      () => undefined,
    );
  }
}
