import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, from, switchMap } from 'rxjs';

import { AppartementDto } from '../model/AppartementDto.model';
import { MailAttachment } from '../model/SendMail.model';
import { codePostalVilleDepuisAdresse, rueDepuisAdresse } from './adresse.util';
import { DocumentGenere } from './doc-generator.service';
import { enBase64 } from './fichier.util';
import { formaterMontant } from './montant.util';
import { joursRestantsDansLeMois, nombreDeJoursDuMois } from './prorata.util';
import { RequestService } from './requestService';

const EXTENSION_DOCX = /\.docx$/i;

/**
 * À qui le bail part, et de quoi le corps du mail a besoin pour se
 * construire. Une interface à plat plutôt que `LocataireDto`/`AppartementDto`
 * imposés : `envoyerBail` a deux appelants (la liste des locataires, qui a un
 * `LocataireDto` complet, et l'écran de génération, qui envoie juste après
 * avoir produit le bail — avant même que la fiche locataire existe) et
 * n'ont donc pas la même donnée source sous la main.
 */
export interface DestinataireBail {
  email: string;
  prenom: string;
  /** Pour l'adresse du logement, la caution et la mise en forme de l'étage. */
  appartement: AppartementDto;
  /** Chambre louée (`result_form.room`), affichée telle quelle. */
  chambre: string | null;
  /** Date d'entrée dans les lieux, au format « AAAA-MM-JJ » ou en `Date`. */
  dateEntree: string | Date | null;
  loyerHorsCharges: number;
  charges: number;
  /** « Visale », « Garant physique », ou `null` si non renseigné. */
  garantieType: string | null;
}

/**
 * L'envoi du projet de bail au candidat, depuis le formulaire comme depuis la
 * liste des candidats. Un seul service : le locataire doit recevoir le même
 * mail quel que soit l'écran d'où part le clic.
 */
@Injectable({
  providedIn: 'root',
})
export class BailEnvoiService {
  constructor(private requestService: RequestService) {}

  /**
   * Convertit les documents en PDF si besoin, puis les envoie en pièces
   * jointes. Le locataire reçoit du PDF : il n'a pas à modifier son contrat, et
   * la mise en page ne dépend plus du logiciel qu'il ouvre.
   *
   * `corpsMailHtml` porte le mail tel que l'écran l'a affiché — le défaut
   * calculé par `corpsMailParDefaut`, ou la version relue/modifiée dans
   * l'éditeur Quill. Absent, le défaut est recalculé ici.
   */
  envoyerBail(
    destinataire: DestinataireBail,
    documents: DocumentGenere[],
    corpsMailHtml?: string,
  ): Observable<void> {
    const html = corpsMailHtml ?? this.corpsMailParDefaut(destinataire);

    return from(this.enPiecesJointes(documents)).pipe(
      switchMap((attachments) =>
        this.requestService.sendMail({
          to: destinataire.email,
          subject: 'Votre projet de bail',
          text: this.htmlVersTexte(html),
          html,
          attachments,
        }),
      ),
    );
  }

  /**
   * Le mail tel qu'il partirait sans intervention, pour l'afficher (et
   * permettre de le modifier) avant l'envoi.
   */
  corpsMailParDefaut(destinataire: DestinataireBail): string {
    return this.corpsDuMail(destinataire);
  }

  /**
   * Les `.docx` passent par LibreOffice sur l'API, les fichiers déjà en PDF
   * sont joints tels quels.
   *
   * Les conversions s'enchaînent une par une : l'API n'en traite qu'une à la
   * fois, deux LibreOffice simultanés dépassant la mémoire du conteneur. Même
   * raison que la boucle de `QuittanceService.convertirEnPdf`.
   */
  private async enPiecesJointes(
    documents: DocumentGenere[],
  ): Promise<MailAttachment[]> {
    const piecesJointes: MailAttachment[] = [];

    for (const document of documents) {
      const enPdf = EXTENSION_DOCX.test(document.nomFichier)
        ? await firstValueFrom(
            this.requestService.convertirEnPdf(
              document.fichier,
              document.nomFichier,
            ),
          )
        : document.fichier;

      piecesJointes.push({
        filename: this.nomPdf(document.nomFichier),
        contentBase64: await enBase64(enPdf),
      });
    }

    return piecesJointes;
  }

  private nomPdf(nomFichier: string): string {
    return nomFichier.replace(EXTENSION_DOCX, '.pdf');
  }

  /**
   * `destinataire.chambre` peut porter la superficie (« Chambre 2 : 9.14 m² »)
   * selon l'écran d'où part l'envoi : on ne garde que le nom, et en minuscule
   * pour s'insérer dans « la location de la chambre 2 ».
   */
  private nomChambre(chambre: string | null): string {
    const nom = chambre?.split(':')[0]?.trim();
    if (!nom) {
      return '';
    }

    return nom.charAt(0).toLowerCase() + nom.slice(1);
  }

  /**
   * L'étage est de la saisie libre : on retire une éventuelle ponctuation
   * finale pour qu'elle ne s'ajoute pas à celle de la phrase qui l'accueille.
   */
  private sansPonctuationFinale(valeur: string): string {
    return valeur.trim().replace(/[.,;:!?]+$/, '');
  }

  /**
   * Le modèle de mail que Sylvain envoyait jusqu'ici à la main, copié depuis
   * Word : adresse et chambre du logement, annexes du bail, prorata du loyer
   * d'entrée et caution calculés, garantie reprise du bail généré.
   *
   * En HTML (et non plus du texte à tabulations) : c'est ce que l'éditeur
   * Quill affiche et modifie, et ce qui part réellement mis en forme au
   * destinataire — `BailEnvoiService.envoyerBail` en tire aussi le texte brut
   * de repli.
   */
  private corpsDuMail(destinataire: DestinataireBail): string {
    const { appartement } = destinataire;
    const rue = rueDepuisAdresse(appartement.adress);
    const codePostalVille = codePostalVilleDepuisAdresse(appartement.adress);

    return [
      '<p>Bonjour,</p>',
      `<p>À la suite de votre intérêt pour le logement situé au ${this.sansPonctuationFinale(appartement.etage)} du ${rue} ${codePostalVille}, vous trouverez ci-joint une version projet de bail en vue de la location de la ${this.nomChambre(destinataire.chambre)}.</p>`,
      '<p>Merci de me faire part de vos éventuelles remarques</p>',
      '<p>Sont annexées et jointes au contrat de location les pièces suivantes :</p>',
      '<ul>',
      "<li>Annexe 1 : L'état des lieux d'entrée et l'inventaire détaillé des meubles et équipements (partie privative et parties communes),</li>",
      `<li>Annexe 2 : ${this.ligneGarantie(destinataire.garantieType)}</li>`,
      "<li>Annexe 3 : Règlement de copropriété concernant la destination de l'immeuble, la jouissance et l'usage des parties privatives et communes,</li>",
      '<li>Annexe 4 : Un dossier de diagnostic technique comprenant',
      '<ul>',
      '<li>Un diagnostic de performance énergétique,</li>',
      "<li>Un état de l'installation intérieure d'électricité et de gaz, dont l'objet est d'évaluer les risques pouvant porter atteinte à la sécurité des personnes,</li>",
      '<li>Un état des risques naturels et technologiques pour les zones couvertes par un plan de prévention des risques technologiques ou par un plan de prévention des risques naturels prévisibles, prescrit approuvé, ou dans des zones de sismicité,</li>',
      "<li>Un rapport de mission de repérage des matériaux et produits contenant de l'amiante.</li>",
      '</ul>',
      '</li>',
      "<li>Annexe 5 : Une notice d'information relative aux droits et obligations des locataires et des bailleurs</li>",
      '</ul>',
      '<p>Si les termes vous conviennent, il conviendra de :</p>',
      '<ul>',
      '<li>Me retourner un exemplaire du bail paraphé en bas de chaque page et signé en dernière page</li>',
      ...(destinataire.garantieType === 'Visale'
        ? []
        : [
            "<li>Me faire parvenir l'engagement de cautionnement renseigné par les garants (x2)</li>",
          ]),
      `<li>Me faire parvenir une attestation d'assurance habitation qui couvre votre responsabilité civile, à partir du ${this.dateFrancaise(destinataire.dateEntree)}</li>`,
      `<li>Procéder au règlement du loyer du mois de ${this.ligneProrata(destinataire)}</li>`,
      `<li>Procéder au règlement de la caution (${formaterMontant(appartement.caution ?? 0)}€)</li>`,
      '</ul>',
      "<p>L'annexe 1 relative à l'état des lieux d'entrée sera signée sur place le jour de l'entrée dans les lieux. Les annexes 3, 4 et 5 sont données à titre d'information et disponible au téléchargement via le lien çi-dessous. Inutile de les signer.</p>",
      '<p>Je reste évidemment joignable pour toute question</p>',
      '<p>Bonne lecture<br>Sylvain<br>06.13.88.31.01</p>',
    ].join('');
  }

  private ligneGarantie(garantieType: string | null): string {
    return garantieType === 'Visale'
      ? garantieType
      : 'Engagement de cautionnement à remplir par les 2 garants';
  }

  /**
   * « juillet (au prorata : 600 x 17 / 31 = 329€) », ou juste le nom du mois si
   * la date d'entrée est absente : le montant ne peut alors pas se calculer.
   */
  private ligneProrata(destinataire: DestinataireBail): string {
    const date = this.versDate(destinataire.dateEntree);
    if (!date) {
      return '[mois]';
    }

    const loyerTotal = destinataire.loyerHorsCharges + destinataire.charges;
    const joursRestants = joursRestantsDansLeMois(date);
    const joursDansMois = nombreDeJoursDuMois(
      date.getMonth() + 1,
      date.getFullYear(),
    );
    const montant = Math.round((loyerTotal * joursRestants) / joursDansMois);
    const nomMois = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(
      date,
    );

    return `${nomMois} (au prorata : ${formaterMontant(loyerTotal)} x ${joursRestants} / ${joursDansMois} = ${montant}€)`;
  }

  /** « AAAA-MM-JJ » ou `Date` -> « JJ/MM/AAAA », « [JJ/MM/AAAA] » si absente. */
  private dateFrancaise(dateEntree: string | Date | null): string {
    const date = this.versDate(dateEntree);
    if (!date) {
      return '[JJ/MM/AAAA]';
    }

    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    return `${jour}/${mois}/${date.getFullYear()}`;
  }

  /**
   * Une chaîne « AAAA-MM-JJ » se découpe telle quelle plutôt que de passer par
   * `new Date(chaîne)`, qui l'interprèterait en UTC et reculerait d'un jour à
   * l'ouest de Greenwich — même précaution que `ResiliationService`.
   */
  private versDate(valeur: string | Date | null): Date | null {
    if (valeur == null) {
      return null;
    }

    if (valeur instanceof Date) {
      return valeur;
    }

    const iso = valeur.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!iso) {
      return null;
    }

    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  /**
   * Le texte brut de repli, pour les clients mail qui ne rendent pas le HTML.
   * `textContent` seul collerait chaque paragraphe et chaque puce bout à bout
   * (il ignore la mise en page, il ne garde que le texte) : les fins de bloc
   * sont donc converties en retours à la ligne avant de le lire.
   */
  private htmlVersTexte(html: string): string {
    const avecRetours = html
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/(p|li|ul)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    const conteneur = document.createElement('div');
    conteneur.innerHTML = avecRetours;

    return (conteneur.textContent ?? '').replace(/\n{2,}/g, '\n\n').trim();
  }
}
