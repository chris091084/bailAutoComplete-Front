import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, from, switchMap } from 'rxjs';

import { MailAttachment } from '../model/SendMail.model';
import { DocumentGenere } from './doc-generator.service';
import { enBase64 } from './fichier.util';
import { RequestService } from './requestService';

const EXTENSION_DOCX = /\.docx$/i;

/** À qui le bail part, et sous quel nom on s'adresse à lui. */
export interface DestinataireBail {
  email: string;
  prenom: string;
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
   */
  envoyerBail(
    destinataire: DestinataireBail,
    documents: DocumentGenere[],
  ): Observable<void> {
    return from(this.enPiecesJointes(documents)).pipe(
      switchMap((attachments) =>
        this.requestService.sendMail({
          to: destinataire.email,
          subject: 'Votre projet de bail',
          text: this.corpsDuMail(destinataire, documents),
          attachments,
        }),
      ),
    );
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
   * Le document envoyé est un projet, pas un contrat signé : le corps du mail le
   * dit, faute de quoi un locataire pressé le signe sans relire.
   */
  private corpsDuMail(
    destinataire: DestinataireBail,
    documents: DocumentGenere[],
  ): string {
    const pieces =
      documents.length > 1
        ? 'Vous trouverez en pièces jointes votre projet de bail ainsi que son annexe (état des lieux).'
        : 'Vous trouverez en pièce jointe votre projet de bail.';

    return [
      `Bonjour ${destinataire.prenom},`,
      '',
      pieces,
      'Merci de le relire attentivement : il vous reste à le dater et à le signer.',
      "N'hésitez pas à revenir vers moi pour toute question ou correction avant signature.",
      '',
      'Bien cordialement,',
    ].join('\n');
  }
}
