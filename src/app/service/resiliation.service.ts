import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import {
  capitaliser,
  rueDepuisAdresse,
  villeDepuisAdresse,
} from './adresse.util';
import { remplirModeleDocx } from './docx.util';

const TEMPLATE_URL = 'assets/docx/resiliation.docx';

@Injectable({
  providedIn: 'root',
})
export class ResiliationService {
  constructor(private http: HttpClient) {}

  /**
   * Produit le courrier de congé pré-rempli au nom du locataire.
   *
   * `dateSignatureContrat` vient du `date_from` du dernier result_form généré
   * pour l'appartement ; faute de génération connue, le modèle retombe sur le
   * crochet « [JJ/MM/AAAA] » que le locataire complète à la main, comme la date
   * de déménagement et la nouvelle adresse.
   */
  genererCourrier(
    locataire: LocataireDto,
    appartement: AppartementDto,
    dateSignatureContrat?: string | Date | null,
  ): Observable<Blob> {
    return this.http
      .get(TEMPLATE_URL, { responseType: 'arraybuffer' })
      .pipe(
        switchMap((data) =>
          from(
            this.remplirModele(
              data,
              locataire,
              appartement,
              dateSignatureContrat,
            ),
          ),
        ),
      );
  }

  nomFichier(locataire: LocataireDto): string {
    return `Resiliation_${locataire.nom}_${locataire.prenom}.docx`;
  }

  private remplirModele(
    data: ArrayBuffer,
    locataire: LocataireDto,
    appartement: AppartementDto,
    dateSignatureContrat?: string | Date | null,
  ): Promise<Blob> {
    return remplirModeleDocx(data, {
      locataireNomPrenom: capitaliser(`${locataire.prenom} ${locataire.nom}`),
      locataireAdresse: rueDepuisAdresse(appartement.adress),
      proprietaireNomPrenom: appartement.bailleur?.name ?? '',
      proprietaireAdresse: rueDepuisAdresse(appartement.bailleur?.adress),
      villeSignature: capitaliser(villeDepuisAdresse(appartement.adress)),
      dateSignatureContrat: this.formaterDate(dateSignatureContrat),
      dateDuJour: this.dateDuJour(),
    });
  }

  /**
   * `date_from` est une colonne `date` : l'API la sérialise en « AAAA-MM-JJ ».
   * On la découpe telle quelle plutôt que de la passer par `new Date()`, qui
   * l'interprèterait en UTC et reculerait d'un jour à l'ouest de Greenwich.
   *
   * Renvoie « [JJ/MM/AAAA] » si la date est absente : le locataire retrouve
   * alors le crochet à compléter, comme avant l'ajout du champ.
   */
  private formaterDate(date?: string | Date | null): string {
    if (!date) {
      return '[JJ/MM/AAAA]';
    }

    if (typeof date === 'string') {
      const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : date;
    }

    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    return `${jour}/${mois}/${date.getFullYear()}`;
  }

  private dateDuJour(): string {
    return this.formaterDate(new Date());
  }
}
