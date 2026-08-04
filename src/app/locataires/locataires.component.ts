import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import saveAs from 'file-saver';
import { catchError, of, switchMap } from 'rxjs';
import { RequestService } from '../service/requestService';
import { ResiliationService } from '../service/resiliation.service';
import {
  QuittanceOptions,
  QuittanceService,
} from '../service/quittance.service';
import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { LocataireModalComponent } from './locataire-modal/locataire-modal.component';
import { ConfirmationEnvoiModalComponent } from './confirmation-envoi-modal/confirmation-envoi-modal.component';
import { QuittanceModalComponent } from './quittance-modal/quittance-modal.component';

@Component({
  selector: 'app-locataires',
  standalone: true,
  imports: [
    CommonModule,
    LocataireModalComponent,
    ConfirmationEnvoiModalComponent,
    QuittanceModalComponent,
  ],
  templateUrl: './locataires.component.html',
  styleUrls: ['./locataires.component.scss'],
})
export class LocatairesComponent implements OnInit {
  locataires: LocataireDto[] = [];
  showModal = false;
  selectedLocataire: LocataireDto | null = null;

  /** Locataire soumis à la confirmation d'envoi ; `null` = modale fermée. */
  locataireAResilier: LocataireDto | null = null;

  /** Id du locataire dont la résiliation part, pour n'occuper qu'un bouton. */
  envoiEnCours: number | null = null;

  /** Locataire dont on prépare la quittance ; `null` = modale fermée. */
  locataireAQuittancer: LocataireDto | null = null;

  /** Id du locataire dont la quittance se génère ou s'envoie. */
  quittanceEnCours: number | null = null;

  /**
   * Quittance en attente de confirmation d'envoi ; `null` = pas de confirmation
   * à l'écran. La modale de quittance reste montée dessous : un renoncement
   * rend la période et la date de paiement telles qu'elles ont été saisies.
   */
  quittanceAConfirmer: QuittanceOptions | null = null;
  messageSucces: string | null = null;
  messageErreur: string | null = null;

  /**
   * Le locataire ne porte qu'un `appartementId` : le courrier a besoin de
   * l'adresse du logement et du bailleur, on garde donc les appartements sous
   * la main plutôt que de les recharger à chaque clic.
   */
  private appartements: AppartementDto[] = [];

  constructor(
    private requestService: RequestService,
    private resiliationService: ResiliationService,
    private quittanceService: QuittanceService,
  ) {}

  ngOnInit(): void {
    this.loadLocataires();
    this.loadAppartements();
  }

  loadLocataires() {
    this.requestService.getLocataires().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.locataires = data;
        } else {
          console.error('Invalid data received', data);
        }
      },
      error: (err) => console.error('Error fetching locataires', err),
    });
  }

  openEditModal(locataire: LocataireDto) {
    this.selectedLocataire = { ...locataire }; // Copy to avoid direct mutation
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedLocataire = null;
  }

  /**
   * Cet écran ne fait que corriger l'existant : un locataire naît de la
   * génération d'un bail, jamais d'une saisie manuelle. Sans id, on refuse.
   */
  onSave(locataire: LocataireDto) {
    if (!locataire.id) {
      this.afficherErreur(
        "Un locataire ne peut être créé que lors de la génération d'un bail.",
      );
      this.closeModal();
      return;
    }

    this.requestService.updateLocataire(locataire).subscribe(() => {
      this.loadLocataires();
      this.closeModal();
    });
  }

  deleteLocataire(id?: number) {
    if (id == null) {
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
      this.requestService.deleteLocataire(id).subscribe(() => {
        this.loadLocataires();
      });
    }
  }

  /**
   * Un mail parti ne se rattrape pas : le clic n'envoie rien, il ouvre la
   * confirmation. L'appartement est vérifié dès maintenant, inutile de faire
   * confirmer un courrier qu'on ne saura pas générer.
   */
  demanderResiliation(locataire: LocataireDto) {
    if (!locataire.email || locataire.id == null) {
      return;
    }

    if (!this.appartementDe(locataire)) {
      this.afficherErreur(
        `Aucun appartement trouvé pour ${locataire.prenom} ${locataire.nom} : impossible de générer le courrier.`,
      );
      return;
    }

    this.locataireAResilier = locataire;
  }

  annulerResiliation() {
    this.locataireAResilier = null;
  }

  /**
   * Génère le courrier de congé pré-rempli et l'envoie au locataire en pièce
   * jointe, puis horodate l'envoi pour que la liste en garde la trace.
   */
  confirmerResiliation(locataire: LocataireDto) {
    const appartement = this.appartementDe(locataire);
    if (!locataire.email || locataire.id == null || !appartement) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.envoiEnCours = locataire.id;

    this.resiliationService
      .genererCourrier(locataire, appartement, locataire.dateSignatureContrat)
      .pipe(
        switchMap((blob) => this.toBase64(blob)),
        switchMap((contentBase64) =>
          this.requestService.sendMail({
            to: locataire.email!,
            subject: 'Courrier de demande de résiliation du bail',
            text: this.corpsDuMail(locataire),
            attachments: [
              {
                filename: this.resiliationService.nomFichier(locataire),
                contentBase64,
              },
            ],
          }),
        ),
        // Le mail est parti : l'échec de l'horodatage ne doit pas se présenter
        // comme un échec d'envoi, on le signale à part.
        switchMap(() =>
          this.requestService.marquerResiliationEnvoyee(locataire.id!).pipe(
            catchError((err) => {
              console.error('Résiliation envoyée mais non horodatée', err);
              return of(null);
            }),
          ),
        ),
      )
      .subscribe({
        next: (misAJour) => {
          this.envoiEnCours = null;
          this.locataireAResilier = null;

          if (misAJour) {
            this.remplacerLocataire(misAJour);
            this.afficherSucces(
              `Lettre de résiliation envoyée à ${locataire.email}.`,
            );
          } else {
            this.afficherErreur(
              `Lettre de résiliation envoyée à ${locataire.email}, mais l'envoi n'a pas pu être enregistré : la liste ne l'affichera pas.`,
            );
          }
        },
        error: (err) => {
          this.envoiEnCours = null;
          this.locataireAResilier = null;
          console.error('Erreur lors de l’envoi de la résiliation', err);
          this.afficherErreur(
            err?.error?.message ??
              "L'envoi de la lettre de résiliation a échoué.",
          );
        },
      });
  }

  /**
   * Ouvre la modale de quittance. Comme pour la résiliation, l'appartement est
   * vérifié dès le clic : il porte l'adresse du logement et le bailleur, sans
   * lesquels la quittance ne veut rien dire.
   */
  demanderQuittance(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    if (!this.appartementDe(locataire)) {
      this.afficherErreur(
        `Aucun appartement trouvé pour ${locataire.prenom} ${locataire.nom} : impossible de générer la quittance.`,
      );
      return;
    }

    this.locataireAQuittancer = locataire;
  }

  annulerQuittance() {
    this.locataireAQuittancer = null;
    this.quittanceAConfirmer = null;
  }

  /**
   * Le mail ne part pas au clic : comme pour la résiliation, il passe par la
   * modale de confirmation, qui nomme le destinataire.
   */
  demanderEnvoiQuittance(options: QuittanceOptions) {
    if (this.locataireAQuittancer?.email) {
      this.quittanceAConfirmer = options;
    }
  }

  annulerEnvoiQuittance() {
    this.quittanceAConfirmer = null;
  }

  /** « la quittance de loyer de janvier 2026 », dans la phrase de confirmation. */
  get documentAConfirmer(): string {
    return this.quittanceAConfirmer
      ? `la quittance de loyer de ${this.quittanceService.libellePeriode(this.quittanceAConfirmer)}`
      : '';
  }

  /** Génère la quittance et la remet au navigateur, sans passer par le mail. */
  telechargerQuittance(options: QuittanceOptions) {
    const locataire = this.locataireAQuittancer;
    const appartement = locataire ? this.appartementDe(locataire) : undefined;
    if (!locataire || locataire.id == null || !appartement) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.quittanceEnCours = locataire.id;

    this.quittanceService
      .genererQuittance(locataire, appartement, options)
      .subscribe({
        next: (blob) => {
          saveAs(blob, this.quittanceService.nomFichier(locataire, options));
          this.quittanceEnCours = null;
          this.locataireAQuittancer = null;
          this.afficherSucces(
            `Quittance de ${this.quittanceService.libellePeriode(options)} téléchargée.`,
          );
        },
        error: (err) =>
          this.echecQuittance(err, 'La génération de la quittance a échoué.'),
      });
  }

  /** Même chemin que la résiliation : génération, puis envoi en pièce jointe. */
  confirmerEnvoiQuittance() {
    const locataire = this.locataireAQuittancer;
    const options = this.quittanceAConfirmer;
    const appartement = locataire ? this.appartementDe(locataire) : undefined;
    if (
      !locataire ||
      !options ||
      !locataire.email ||
      locataire.id == null ||
      !appartement
    ) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.quittanceEnCours = locataire.id;

    const periode = this.quittanceService.libellePeriode(options);

    this.quittanceService
      .genererQuittance(locataire, appartement, options)
      .pipe(
        switchMap((blob) => this.toBase64(blob)),
        switchMap((contentBase64) =>
          this.requestService.sendMail({
            to: locataire.email!,
            subject: `Quittance de loyer - ${periode}`,
            text: this.corpsDuMailQuittance(locataire, periode),
            attachments: [
              {
                filename: this.quittanceService.nomFichier(locataire, options),
                contentBase64,
              },
            ],
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.quittanceEnCours = null;
          this.locataireAQuittancer = null;
          this.quittanceAConfirmer = null;
          this.afficherSucces(
            `Quittance de ${periode} envoyée à ${locataire.email}.`,
          );
        },
        error: (err) =>
          this.echecQuittance(err, "L'envoi de la quittance a échoué."),
      });
  }

  private echecQuittance(err: any, message: string) {
    this.quittanceEnCours = null;
    this.locataireAQuittancer = null;
    this.quittanceAConfirmer = null;
    console.error('Erreur lors de la génération de la quittance', err);
    this.afficherErreur(err?.error?.message ?? message);
  }

  /**
   * Le locataire ne porte qu'un `appartementId`, et `AppartementDto` type son
   * id en chaîne : d'où la comparaison numérique.
   */
  private appartementDe(locataire: LocataireDto): AppartementDto | undefined {
    return this.appartements.find(
      (a) => Number(a.id) === locataire.appartementId,
    );
  }

  /** Évite un rechargement complet de la liste pour une seule ligne. */
  private remplacerLocataire(locataire: LocataireDto) {
    this.locataires = this.locataires.map((existant) =>
      existant.id === locataire.id ? locataire : existant,
    );
  }

  private loadAppartements() {
    this.requestService.getAppartements().subscribe({
      next: (data) => (this.appartements = data ?? []),
      error: (err) => console.error('Error fetching appartements', err),
    });
  }

  private corpsDuMail(locataire: LocataireDto): string {
    const aCompleter =
    'Il vous reste à compléter la date de déménagement et votre nouvelle adresse, puis à la dater et la signer.'
   

    return [
      `Bonjour ${locataire.prenom},`,
      '',
      'Vous trouverez en pièce jointe votre lettre de résiliation pré-remplie.',
      aCompleter,
      '',
      'Cordialement,',
    ].join('\n');
  }

  private corpsDuMailQuittance(
    locataire: LocataireDto,
    periode: string,
  ): string {
    return [
      `Bonjour ${locataire.prenom} ${locataire.nom},`,
      '',
      `Vous trouverez en pièce jointe votre quittance de loyer pour la période de ${periode}.`,
      'Elle vaut reçu du loyer et des charges pour cette période.',
      '',
      'Cordialement,',
    ].join('\n');
  }

  /** Extrait le base64 de la data URL produite par FileReader. */
  private toBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private afficherSucces(message: string) {
    this.messageSucces = message;
    setTimeout(() => (this.messageSucces = null), 6000);
  }

  private afficherErreur(message: string) {
    this.messageErreur = message;
    setTimeout(() => (this.messageErreur = null), 8000);
  }
}
