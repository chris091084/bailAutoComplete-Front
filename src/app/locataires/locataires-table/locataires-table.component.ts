import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, map, of, switchMap } from 'rxjs';
import { RequestService } from '../../service/requestService';
import { ResiliationService } from '../../service/resiliation.service';
import { BailEnvoiService } from '../../service/bail-envoi.service';
import { couleurTexteSur } from '../../service/couleur.util';
import { enBase64 } from '../../service/fichier.util';
import { telechargerFichier } from '../../service/telechargement.util';
import {
  QuittanceGeneree,
  QuittanceOptions,
  QuittanceService,
} from '../../service/quittance.service';
import { AppartementDto } from '../../model/AppartementDto.model';
import { LocataireDto } from '../../model/LocataireDto.model';
import { LocataireModalComponent } from '../locataire-modal/locataire-modal.component';
import { ConfirmationEnvoiModalComponent } from '../confirmation-envoi-modal/confirmation-envoi-modal.component';
import { EnvoiBailModalComponent } from '../envoi-bail-modal/envoi-bail-modal.component';
import { QuittanceModalComponent } from '../quittance-modal/quittance-modal.component';
import { SignatureModalComponent } from '../signature-modal/signature-modal.component';
import { SortieModalComponent } from '../sortie-modal/sortie-modal.component';

/**
 * Le tableau des locataires et tout ce qui s'y attache — modification, sortie,
 * quittance, résiliation. Extrait de `LocatairesComponent` pour que la liste
 * des appartements offre exactement les mêmes actions sur les locataires du
 * logement, sans que les deux écrans divergent.
 *
 * Le composant ne modifie jamais le tableau qu'on lui passe : chaque action
 * réussie émet `rafraichir`, à charge du parent de recharger ses listes.
 */
@Component({
  selector: 'app-locataires-table',
  imports: [
    CommonModule,
    LocataireModalComponent,
    ConfirmationEnvoiModalComponent,
    EnvoiBailModalComponent,
    QuittanceModalComponent,
    SignatureModalComponent,
    SortieModalComponent,
  ],
  templateUrl: './locataires-table.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./locataires-table.component.scss'],
})
export class LocatairesTableComponent {
  @Input() locataires: LocataireDto[] = [];

  /**
   * L'état des fiches affichées, qui change la dernière colonne et les boutons
   * offerts : un candidat n'a que la signature, un locataire sorti que la
   * réintégration, un locataire en place toutes les autres actions.
   */
  @Input() mode: 'candidats' | 'actifs' | 'sortis' = 'actifs';

  /**
   * Le locataire ne porte qu'un `appartementId`, or le courrier a besoin de
   * l'adresse du logement et du bailleur : le parent, qui a déjà la liste sous
   * la main, la fournit plutôt que de la faire recharger ici.
   */
  @Input() appartements: AppartementDto[] = [];

  /** Inutile dans l'accordéon d'un appartement, qui la répéterait à l'infini. */
  @Input() afficherColonneAppartement = true;

  @Input() messageListeVide = 'Aucun locataire enregistré.';

  /** Une action a modifié les données : le parent recharge ses listes. */
  @Output() rafraichir = new EventEmitter<void>();

  showModal = false;
  selectedLocataire: LocataireDto | null = null;

  /** Candidat soumis à la confirmation de signature ; `null` = modale fermée. */
  locataireASigner: LocataireDto | null = null;

  /** Id du candidat dont la signature s'enregistre, pour n'occuper qu'un bouton. */
  signatureEnCours: number | null = null;

  /** Candidat dont on prépare l'envoi du bail ; `null` = modale fermée. */
  locataireAEnvoyerBail: LocataireDto | null = null;

  /** Id du candidat dont le bail part, pour n'occuper qu'un bouton. */
  bailEnvoiEnCours: number | null = null;

  /** Locataire dont on saisit la date de sortie ; `null` = modale fermée. */
  locataireASortir: LocataireDto | null = null;

  /** Id du locataire dont la sortie ou la réintégration s'enregistre. */
  sortieEnCours: number | null = null;

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
   * Ids des locataires dépliés. En mobile la ligne n'a pas la place de porter
   * ses boutons : elle s'ouvre dessous, comme l'accordéon des appartements. Sur
   * grand écran les actions restent dans leur colonne et cet état ne sert pas.
   */
  private lignesOuvertes = new Set<number>();

  constructor(
    private requestService: RequestService,
    private resiliationService: ResiliationService,
    private quittanceService: QuittanceService,
    private bailEnvoiService: BailEnvoiService,
  ) {}

  /**
   * Le colspan de la ligne « aucun locataire » : à tenir à jour avec l'en-tête.
   * Dix colonnes communes, plus l'appartement quand il est affiché, plus celle
   * propre au mode — l'envoi du bail pour les candidats, la résiliation pour les
   * actifs, la date de sortie pour les sortis. Chaque mode en a exactement une.
   */
  get nombreColonnes(): number {
    return 11 + (this.afficherColonneAppartement ? 1 : 0);
  }

  /**
   * Le loyer charges comprises, celui-là même que porte la quittance. `null`
   * pour les fiches sans result_form rattaché, qui n'ont aucun montant : mieux
   * vaut un tiret qu'un 0 € qu'on prendrait pour un loyer gratuit.
   */
  loyerCharges(locataire: LocataireDto): number | null {
    if (locataire.loyerHorsCharges == null && locataire.charges == null) {
      return null;
    }

    return (locataire.loyerHorsCharges ?? 0) + (locataire.charges ?? 0);
  }

  /**
   * L'âge affiché dans la liste : celui atteint au dernier anniversaire, la
   * fiche portant la date de naissance complète. `null` tant qu'elle n'est pas
   * saisie.
   *
   * La date est découpée à la main plutôt que passée à `new Date` : la chaîne
   * « AAAA-MM-JJ » y serait lue en UTC et pourrait décaler d'un jour, donc
   * d'un an la veille d'un anniversaire.
   */
  age(locataire: LocataireDto): number | null {
    const parties = locataire.dateNaissance?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parties) {
      return null;
    }

    const [annee, mois, jour] = parties.slice(1).map(Number);
    const aujourdhui = new Date();
    const age = aujourdhui.getFullYear() - annee;
    const anniversairePasse =
      aujourdhui.getMonth() + 1 > mois ||
      (aujourdhui.getMonth() + 1 === mois && aujourdhui.getDate() >= jour);

    return anniversairePasse ? age : age - 1;
  }

  /**
   * La couleur de la chambre est portée par un badge accolé au nom, et non
   * plus par le fond de la ligne : elle y écrasait le zébrage du tableau et
   * rendait le texte illisible dès que la teinte était soutenue. Le badge, lui,
   * choisit son texte selon la clarté de la couleur.
   */
  couleurTexteBadge(couleur: string | null | undefined): string {
    return couleurTexteSur(couleur);
  }

  /**
   * Ce que le badge annonce : la seule superficie de la chambre. Le libellé
   * complet — « Chambre 2 : 9.14 m² » — doublerait la largeur de la colonne du
   * nom, alors que la couleur suffit déjà à distinguer les chambres entre
   * elles ; reste la superficie, qui, elle, ne se lit nulle part ailleurs.
   *
   * Le libellé vient de la base sans garantie de forme : faute de « : », il est
   * repris tel quel plutôt que rendu vide.
   */
  libelleChambre(locataire: LocataireDto): string {
    const libelle = locataire.chambre?.trim();
    if (!libelle) {
      return 'Chambre';
    }

    return libelle.split(':').pop()?.trim() || libelle;
  }

  estOuverte(locataire: LocataireDto): boolean {
    return locataire.id != null && this.lignesOuvertes.has(locataire.id);
  }

  basculerLigne(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    if (!this.lignesOuvertes.delete(locataire.id)) {
      this.lignesOuvertes.add(locataire.id);
    }
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
      this.rafraichir.emit();
      this.closeModal();
    });
  }

  /**
   * Seule action offerte sur un candidat : déclarer son bail signé. Le clic
   * n'enregistre rien, il ouvre la confirmation — rien ne ramène ensuite la
   * fiche à l'état de candidat.
   */
  demanderSignature(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    this.locataireASigner = locataire;
  }

  annulerSignature() {
    this.locataireASigner = null;
  }

  confirmerSignature() {
    const locataire = this.locataireASigner;
    if (!locataire || locataire.id == null) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.signatureEnCours = locataire.id;

    this.requestService.signerBail(locataire.id).subscribe({
      next: () => {
        this.signatureEnCours = null;
        this.locataireASigner = null;
        this.rafraichir.emit();
        this.afficherSucces(
          `${locataire.prenom} ${locataire.nom} est désormais locataire.`,
        );
      },
      error: (err) => {
        this.signatureEnCours = null;
        this.locataireASigner = null;
        console.error('Erreur lors du passage du candidat en locataire', err);
        this.afficherErreur(
          err?.error?.message ?? 'Le passage en locataire a échoué.',
        );
      },
    });
  }

  /**
   * L'autre action offerte sur un candidat : lui envoyer son bail. Comme la
   * résiliation, le clic n'envoie rien — il ouvre la modale, qui recueille le
   * document relu.
   *
   * Le bail n'est pas conservé côté serveur : c'est le fichier déposé qui part,
   * et c'est le but — le bailleur l'a ouvert dans Word, vérifié sa mise en page
   * et corrigé ce qu'il fallait avant de le remettre ici.
   */
  demanderEnvoiBail(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    this.locataireAEnvoyerBail = locataire;
  }

  annulerEnvoiBail() {
    this.locataireAEnvoyerBail = null;
  }

  /**
   * Envoie les documents déposés, puis horodate. Comme pour la résiliation,
   * l'échec de l'horodatage ne se présente pas comme un échec d'envoi : le mail
   * est parti.
   */
  confirmerEnvoiBail(fichiers: File[]) {
    const locataire = this.locataireAEnvoyerBail;
    if (!locataire?.email || locataire.id == null || fichiers.length === 0) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.bailEnvoiEnCours = locataire.id;

    this.bailEnvoiService
      .envoyerBail(
        { email: locataire.email, prenom: locataire.prenom },
        fichiers.map((fichier) => ({ fichier, nomFichier: fichier.name })),
      )
      .pipe(
        switchMap(() =>
          this.requestService.marquerBailEnvoye(locataire.id!).pipe(
            catchError((err) => {
              console.error('Bail envoyé mais non horodaté', err);
              return of(null);
            }),
          ),
        ),
      )
      .subscribe({
        next: (misAJour) => {
          this.bailEnvoiEnCours = null;
          this.locataireAEnvoyerBail = null;

          if (misAJour) {
            this.rafraichir.emit();
            this.afficherSucces(`Bail envoyé à ${locataire.email}.`);
          } else {
            this.afficherErreur(
              `Bail envoyé à ${locataire.email}, mais l'envoi n'a pas pu être enregistré : la liste ne l'affichera pas.`,
            );
          }
        },
        error: (err) => {
          this.bailEnvoiEnCours = null;
          this.locataireAEnvoyerBail = null;
          console.error("Erreur lors de l’envoi du bail", err);
          this.afficherErreur(
            err?.error?.message ?? "L'envoi du bail a échoué.",
          );
        },
      });
  }

  /**
   * Un locataire ne se supprime pas, il sort : le clic ouvre la saisie de la
   * date de départ, qui bascule la fiche dans l'onglet des sortis.
   */
  demanderSortie(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    this.locataireASortir = locataire;
  }

  annulerSortie() {
    this.locataireASortir = null;
  }

  confirmerSortie(sortie: string) {
    const locataire = this.locataireASortir;
    if (!locataire || locataire.id == null) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.sortieEnCours = locataire.id;

    this.requestService.marquerSortie(locataire.id, sortie).subscribe({
      next: () => {
        this.sortieEnCours = null;
        this.locataireASortir = null;
        this.rafraichir.emit();
        this.afficherSucces(
          `${locataire.prenom} ${locataire.nom} est sorti du logement.`,
        );
      },
      error: (err) => {
        this.sortieEnCours = null;
        this.locataireASortir = null;
        console.error('Erreur lors de la sortie du locataire', err);
        this.afficherErreur(
          err?.error?.message ??
            "La sortie du locataire n'a pas pu être enregistrée.",
        );
      },
    });
  }

  /** Seule action offerte sur un locataire sorti : le remettre en place. */
  reintegrerLocataire(locataire: LocataireDto) {
    if (locataire.id == null) {
      return;
    }

    if (
      !confirm(
        `Réintégrer ${locataire.prenom} ${locataire.nom} dans la liste des locataires ?`,
      )
    ) {
      return;
    }

    this.messageSucces = null;
    this.messageErreur = null;
    this.sortieEnCours = locataire.id;

    this.requestService.reintegrerLocataire(locataire.id).subscribe({
      next: () => {
        this.sortieEnCours = null;
        this.rafraichir.emit();
        this.afficherSucces(
          `${locataire.prenom} ${locataire.nom} est de nouveau dans la liste des locataires.`,
        );
      },
      error: (err) => {
        this.sortieEnCours = null;
        console.error('Erreur lors de la réintégration du locataire', err);
        this.afficherErreur(
          err?.error?.message ?? 'La réintégration du locataire a échoué.',
        );
      },
    });
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
        switchMap((blob) => enBase64(blob)),
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
            this.rafraichir.emit();
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

  /**
   * « la quittance de loyer de janvier 2026 », ou « les 4 quittances de loyer
   * de janvier 2026 à avril 2026 », dans la phrase de confirmation.
   */
  get documentAConfirmer(): string {
    if (!this.quittanceAConfirmer) {
      return '';
    }

    const periode = this.quittanceService.libellePeriode(
      this.quittanceAConfirmer,
    );
    const nombreMois = this.quittanceService.moisDeLaPeriode(
      this.quittanceAConfirmer,
    ).length;

    return nombreMois > 1
      ? `les ${nombreMois} quittances de loyer de ${periode}`
      : `la quittance de loyer de ${periode}`;
  }

  /**
   * Génère les quittances de la période — une par mois — et les remet au
   * navigateur, sans passer par le mail. Sur plusieurs mois, le navigateur
   * reçoit autant de fichiers et peut demander confirmation avant de les
   * enregistrer.
   */
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
      .genererQuittances(locataire, appartement, options)
      .subscribe({
        next: (quittances) => {
          quittances.forEach((quittance) =>
            telechargerFichier(quittance.fichier, quittance.nomFichier),
          );
          this.quittanceEnCours = null;
          this.locataireAQuittancer = null;
          this.afficherSucces(this.succesQuittances(quittances, 'téléchargée'));
        },
        error: (err) =>
          this.echecQuittance(err, 'La génération des quittances a échoué.'),
      });
  }

  /**
   * Même chemin que la résiliation : génération, puis envoi en pièces jointes.
   * Les quittances de la période partent dans un seul mail, un fichier par
   * mois — le locataire reçoit un envoi, pas quatre.
   */
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
      .genererQuittances(locataire, appartement, options)
      .pipe(
        switchMap((quittances) =>
          Promise.all(
            quittances.map((quittance) =>
              enBase64(quittance.fichier).then((contentBase64) => ({
                filename: quittance.nomFichier,
                contentBase64,
              })),
            ),
          ).then((attachments) => ({ quittances, attachments })),
        ),
        switchMap(({ quittances, attachments }) =>
          this.requestService
            .sendMail({
              to: locataire.email!,
              subject:
                quittances.length > 1
                  ? `Quittances de loyer - ${periode}`
                  : `Quittance de loyer - ${periode}`,
              text: this.corpsDuMailQuittance(locataire, quittances),
              attachments,
            })
            .pipe(map(() => quittances)),
        ),
      )
      .subscribe({
        next: (quittances) => {
          this.quittanceEnCours = null;
          this.locataireAQuittancer = null;
          this.quittanceAConfirmer = null;
          this.afficherSucces(
            this.succesQuittances(
              quittances,
              `envoyée à ${locataire.email}`,
              `envoyées à ${locataire.email}`,
            ),
          );
        },
        error: (err) =>
          this.echecQuittance(err, "L'envoi des quittances a échoué."),
      });
  }

  /**
   * « Quittance de janvier 2026 téléchargée. » au singulier, « 4 quittances
   * (janvier 2026 à avril 2026) téléchargées. » au-delà.
   */
  private succesQuittances(
    quittances: QuittanceGeneree[],
    action: string,
    actionPluriel = `${action}s`,
  ): string {
    if (quittances.length === 1) {
      return `Quittance de ${quittances[0].libelle} ${action}.`;
    }

    const premier = quittances[0].libelle;
    const dernier = quittances[quittances.length - 1].libelle;

    return `${quittances.length} quittances (${premier} à ${dernier}) ${actionPluriel}.`;
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

  private corpsDuMail(locataire: LocataireDto): string {
    const aCompleter =
      'Il vous reste à compléter la date de déménagement et votre nouvelle adresse, puis à la dater et la signer.';

    return [
      `Bonjour ${locataire.prenom},`,
      '',
      'Vous trouverez en pièce jointe votre lettre de résiliation pré-remplie.',
      aCompleter,
      '',
      'Cordialement,',
    ].join('\n');
  }

  /**
   * Sur plusieurs mois, le mail énumère les quittances jointes : le locataire
   * doit pouvoir vérifier qu'aucun mois ne manque sans ouvrir les fichiers.
   */
  private corpsDuMailQuittance(
    locataire: LocataireDto,
    quittances: QuittanceGeneree[],
  ): string {
    const entete = `Bonjour ${locataire.prenom},`;

    if (quittances.length === 1) {
      return [
        entete,
        '',
        `Vous trouverez en pièce jointe votre quittance de loyer pour le mois de ${quittances[0].libelle}.`,
        'Elle vaut reçu du loyer et des charges pour cette période.',
        '',
        'Cordialement,',
      ].join('\n');
    }

    return [
      entete,
      '',
      `Vous trouverez en pièce jointe vos ${quittances.length} quittances de loyer, une par mois :`,
      ...quittances.map((quittance) => `- ${quittance.libelle}`),
      '',
      'Chacune vaut reçu du loyer et des charges pour le mois qu’elle couvre.',
      '',
      'Cordialement,',
    ].join('\n');
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
