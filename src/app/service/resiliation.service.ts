import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Observable, map } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';

const TEMPLATE_URL = 'assets/docx/resiliation.docx';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
        map((data) =>
          this.remplirModele(
            data,
            locataire,
            appartement,
            dateSignatureContrat,
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
  ): Blob {
    const zip = new PizZip(new Uint8Array(data));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    console.log(this.formaterDate(dateSignatureContrat))

    doc.render({
      locataireNomPrenom: this.capitaliser(
        `${locataire.prenom} ${locataire.nom}`,
      ),
      locataireAdresse: this.rueDepuisAdresse(appartement.adress),
      proprietaireNomPrenom: appartement.bailleur?.name ?? '',
      proprietaireAdresse: this.rueDepuisAdresse(appartement.bailleur?.adress),
      villeSignature: this.villeDepuisAdresse(appartement.adress),
      dateSignatureContrat: this.formaterDate(dateSignatureContrat),
      dateDuJour: this.dateDuJour(),
    });

    return doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME });
  }

  /**
   * « 56 rue de la Filature - 69100 VILLEURBANNE » -> « 56 rue de la Filature ».
   * L'en-tête du courrier ne veut que la voie : le tiret séparateur, le code
   * postal et la commune sont coupés à partir du premier code postal rencontré.
   */
  private rueDepuisAdresse(adresse?: string): string {
    return adresse?.replace(/[\s,;-]*\d{5}\b[\s\S]*$/, '').trim() ?? '';
  }

  /**
   * « 56 rue de la Filature - 69100 VILLEURBANNE » -> « Villeurbanne ».
   * Les adresses saisies mettent la ville en capitales, ce qui détonnerait
   * dans la ligne de signature.
   */
  private villeDepuisAdresse(adresse?: string): string {
    return this.capitaliser(adresse?.match(/\d{5}\s+(.+)$/)?.[1]?.trim());
  }

  /**
   * « jean-pierre DUPONT » -> « Jean-Pierre Dupont ». Les saisies mélangent
   * capitales et minuscules ; le courrier veut une initiale par mot, en
   * traitant les composés (tiret, apostrophe) comme autant de mots.
   */
  private capitaliser(texte?: string): string {
    return (
      texte?.replace(
        /[^\s\-']+/g,
        (mot) => mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase(),
      ) ?? ''
    );
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
