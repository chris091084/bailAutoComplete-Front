import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Appartement } from '../model/appartement.model';
import { Bailleur } from '../model/bailleur.model';
import { ResultForm } from '../model/resultForm.model';
import { RequestService } from '../service/requestService';
import { Chambre } from '../model/Chambre.model';
import { HttpClient } from '@angular/common/http';
import { AppartementDto } from '../model/AppartementDto.model';
import { LocataireDto } from '../model/LocataireDto.model';
import { ErrorMessagesComponent } from '../error-messages/error-messages.component';
import { BrouillonPayload } from '../model/Brouillon.model';
import { messageErreurHttp } from '../service/http-error.util';

import {
  DocGeneratorService,
  DocumentGenere,
  ResultatGeneration,
} from '../service/doc-generator.service';
import { BailEnvoiService, DestinataireBail } from '../service/bail-envoi.service';
import { telechargerFichier } from '../service/telechargement.util';
import { ApercuBailModalComponent } from '../documents/apercu-bail-modal/apercu-bail-modal.component';
import { LacataireFieldsComponent } from './lacataire-fields/lacataire-fields.component';

/**
 * Libellés des champs du formulaire, pour dire lesquels manquent plutôt que de
 * laisser l'utilisateur remonter un long formulaire à la recherche du rouge.
 */
const LIBELLES_CHAMPS: Record<string, string> = {
  name: 'Nom',
  firstname: 'Prénom',
  adress: 'Adresse',
  email: 'Email',
  from: 'Date de début',
  to: 'Date de fin',
  motif: 'Motif',
  room: 'Chambre',
  appartement: 'Appartement',
  priceNoCharge: 'Loyer mensuel hors charges',
  chargePrice: 'Montant des charges',
  typeBail: 'Type de bail',
  tIrl: "Trimestre de l'IRL",
  valIrl: "Valeur de l'IRL",
  lastPriceWithoutCharge: 'Loyer hors charges du dernier locataire',
  typeResidence: 'Type de résidence',
  rentRef: 'Loyer de référence',
  rentRefMaj: 'Loyer de référence majoré',
  garantieType: 'Type de garantie',
};

@Component({
    selector: 'app-form-doc',
    templateUrl: './form-doc.component.html',
    styleUrls: ['./form-doc.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
    ErrorMessagesComponent,
    ReactiveFormsModule,
    ApercuBailModalComponent,
    LacataireFieldsComponent
]
})
export class FormDocComponent {
  //APPARTEMENT

  appartments: AppartementDto[] = [];

  typeBails = ['Mobilité', 'Etudiant', 'Indéterminé'];
  pieces: string[] = [];
  chambres: Chambre[] = [];
  bailleurSelected: any;
  appartementName: string | undefined;
  typeResidences = ['Principale', 'Secondaire'];
  typesGarantie = ['Visale', 'Garant physique'];
  resultForm: ResultForm = new ResultForm();
  appartementSelected?: AppartementDto;
  modifyRentRefMaj: boolean = false;
  modifyRentRef: boolean = false;
  dateNow = new Date();
  modifyValIrl?: boolean = false;
  modifyTirl?: boolean = false;
  isSubmit: boolean = false;
  typBailSelected: string = '';
  isLoading: boolean = false;
  isGenerating: boolean = false;
  isSaving: boolean = false;

  /**
   * Le bail produit, en attente de ce que l'utilisateur en décidera : envoi,
   * téléchargement, ou rien. Non nul tant que la modale de relecture est
   * ouverte, ce qui suffit à l'afficher.
   */
  resultatGeneration: ResultatGeneration | null = null;
  /** Le bail converti, tel qu'il est montré et tel qu'il partira. */
  apercuBail: Blob | null = null;
  /** Le mail par défaut, affiché (et modifiable) dans la modale de relecture. */
  corpsMailPourEnvoi = '';
  /** Un envoi en cours verrouille la modale sans la fermer. */
  envoiEnCours = false;

  /** Ce que l'écran a à dire à l'utilisateur après une action. */
  messageErreur: string | null = null;
  messageSucces: string | null = null;

  /**
   * Id de la ligne `result_form` de cette saisie, quand elle a été mise de côté
   * ou reprise depuis l'historique. Il évite d'empiler une nouvelle ligne à
   * chaque enregistrement, et se solde à la génération du bail.
   */
  brouillonId: number | null = null;

  // Formulaire de document
  formDoc = new FormGroup({
    name: new FormControl('', Validators.required),
    firstname: new FormControl('', Validators.required),
    adress: new FormControl('', Validators.required),
    email: new FormControl('', Validators.required),
    telephone: new FormControl(''),
    // Ni l'un ni l'autre n'entre dans les documents générés : ils ne servent
    // qu'à renseigner la fiche locataire, d'où l'absence de `required`, qui
    // bloquerait la génération d'un bail pour un champ qu'elle n'utilise pas.
    dateNaissance: new FormControl(''),
    profession: new FormControl(''),
    from: new FormControl('', Validators.required),
    to: new FormControl({ value: '', disabled: true }),
    motif: new FormControl(
      '',
      this.typBailSelected === 'Mobilité' ? Validators.required : null,
    ),
    room: new FormControl('', Validators.required),
    appartement: new FormControl(null, Validators.required),
    priceNoCharge: new FormControl(null, Validators.required),
    chargePrice: new FormControl(null, Validators.required),
    typeBail: new FormControl('', Validators.required),
    tIrl: new FormControl({ value: '', disabled: true }, Validators.required),
    valIrl: new FormControl({ value: '', disabled: true }, Validators.required),
    lastPriceWithoutCharge: new FormControl(null, Validators.required),
    chargeList: new FormControl(false),
    clauseLess6Month: new FormControl(false),
    typeResidence: new FormControl('', Validators.required),
    garantieType: new FormControl('', Validators.required),
    rentRef: new FormControl({ value: 0, disabled: true }, Validators.required),
    rentRefMaj: new FormControl(
      { value: 0, disabled: true },
      Validators.required,
    ),
  });
  constructor(
    private requestService: RequestService,
    private docGeneratorService: DocGeneratorService,
    private bailEnvoiService: BailEnvoiService,
    private router: Router,
  ) {
    this.loadAppartements();
    const etat = this.router.getCurrentNavigation()?.extras.state;
    const rehydrationData = etat?.['rehydrationData'];
    // Seule une saisie mise de côté se réenregistre sur place : le result_form
    // d'un bail déjà généré appartient à l'historique, on repart d'une copie.
    this.brouillonId = etat?.['brouillonId'] ?? null;
    if (rehydrationData) {
      setTimeout(() => {
        this.rehydrateForm(rehydrationData);
      }, 500); // Small delay to ensure appartements are loaded if needed, though ideal flow handles this robustly
    }
  }

  rehydrateForm(data: any) {
    // Avant le patch : c'est lui qui rouvre la date de fin, qu'un bail à durée
    // indéterminée laisse fermée. Sans ça, une saisie reprise la perdrait.
    if (data.bailType) {
      this.isMobilite(data.bailType);
    }

    this.formDoc.patchValue({
      name: data.name,
      firstname: data.firstname,
      adress: data.adress,
      email: data.email,
      telephone: data.telephone,
      from: data.from,
      to: data.to,
      motif: data.motif,
      room: data.room,
      // appartement: handled separately if needed, or by simple patch if object matches
      priceNoCharge: data.priceNoCharge,
      chargePrice: data.chargePrice,
      typeBail: data.bailType, // Mapping bailType to typeBail
      tIrl: data.tIrl,
      valIrl: data.valIrl,
      lastPriceWithoutCharge: data.lastPriceWithoutCharge,
      chargeList: data.chargeList,
      clauseLess6Month: data.clauseLess6Month,
      typeResidence: data.typeResidence,
      garantieType: data.garantieType,
      rentRef: data.rentRef,
      rentRefMaj: data.rentRefMaj,
    });

    if (data.appartement) {
      // L'appartement de la saisie est retrouvé dans la liste chargée : c'est
      // cette instance-là que le bouton radio compare à sa valeur.
      const matchingAppartement = this.appartments.find(
        (a) => a.id === data.appartement.id,
      );
      if (matchingAppartement) {
        // Passe par switchRooms : les chambres proposées viennent de
        // l'appartement, sans elles la chambre saisie n'a aucun bouton où se
        // reposer et la reprise perd le champ.
        this.switchRooms(
          matchingAppartement.chambres,
          matchingAppartement.bailleur,
          matchingAppartement,
        );
        this.formDoc.controls['appartement'].setValue(
          matchingAppartement as any,
        );
        // switchRooms vient de recharger l'IRL et les loyers de référence du
        // logement : la saisie reprise reprend les siens, ce sont ceux du bail
        // en préparation. À défaut seulement, ceux de l'appartement font foi.
        this.formDoc.patchValue({
          room: data.room,
          tIrl: data.tIrl ?? matchingAppartement.tIrl,
          valIrl: data.valIrl ?? matchingAppartement.valIrl,
          rentRef: data.rentRef ?? matchingAppartement.rentRef,
          rentRefMaj: data.rentRefMaj ?? matchingAppartement.rentRefMaj,
        });
      }
    }

    if (data.bailleur) {
      this.bailleurSelected = data.bailleur;
    }
  }

  onSubmit() {
    this.isSubmit = true;
    this.messageSucces = null;
    this.messageErreur = null;

    // Le bouton reste cliquable sur un formulaire incomplet : désactivé, il
    // laissait l'utilisateur sans rien à lire ni rien à corriger.
    if (!this.formDoc.valid) {
      const manquants = this.champsManquants();
      this.messageErreur = `Le bail ne peut pas être généré : ${manquants.join(', ')} ${manquants.length > 1 ? 'sont à renseigner' : 'est à renseigner'}.`;
      return;
    }

    this.alimenterResultForm();
    this.isGenerating = true;

    this.docGeneratorService
      .generateDoc(this.resultForm, this.appartementSelected)
      .subscribe({
        next: (resultat) => this.ouvrirRelecture(resultat),
        error: (err) => {
          console.error('Bail non généré', err);
          this.isGenerating = false;
          this.messageErreur = messageErreurHttp(
            err,
            "Le bail n'a pas pu être généré",
          );
        },
      });
  }

  /**
   * Le bail est produit : il passe par la relecture avant toute chose. Rien
   * n'est encore téléchargé ni envoyé, c'est la modale qui en décidera.
   *
   * L'aperçu demande une conversion en PDF à l'API. Si elle échoue, la
   * génération n'en est pas moins réussie : la modale s'ouvre sans aperçu, avec
   * de quoi télécharger le `.docx` et le relire dans Word.
   */
  private ouvrirRelecture(resultat: ResultatGeneration) {
    this.requestService
      .convertirEnPdf(resultat.bail.fichier, resultat.bail.nomFichier)
      .subscribe({
        next: (pdf) => this.afficherRelecture(resultat, pdf),
        error: (err) => {
          console.error('Aperçu du bail non disponible', err);
          this.afficherRelecture(resultat, null);
        },
      });
  }

  /**
   * La modale ne s'ouvre qu'une fois la conversion tranchée, réussie ou non :
   * l'ouvrir avant afficherait « aperçu indisponible » le temps de la
   * conversion, alors qu'elle est simplement en cours.
   */
  private afficherRelecture(resultat: ResultatGeneration, pdf: Blob | null) {
    this.apercuBail = pdf;
    this.resultatGeneration = resultat;
    this.isGenerating = false;

    const destinataire = this.destinataireBail();
    this.corpsMailPourEnvoi = destinataire
      ? this.bailEnvoiService.corpsMailParDefaut(destinataire)
      : '';
  }

  /**
   * Ce que le mail d'envoi a besoin de connaître, tel que le formulaire l'a
   * saisi. `null` si l'appartement n'est pas encore choisi : la relecture ne
   * s'ouvre normalement qu'une fois le bail généré, donc jamais dans ce cas,
   * mais `envoyerBail` doit rester défensif.
   */
  private destinataireBail(): DestinataireBail | null {
    const email = this.emailLocataireSaisi;
    if (!email || !this.appartementSelected) {
      return null;
    }

    return {
      email,
      prenom: this.formDoc.get('firstname')?.value ?? '',
      appartement: this.appartementSelected,
      chambre: this.formDoc.get('room')?.value ?? null,
      dateEntree: this.formDoc.get('from')?.getRawValue() ?? null,
      loyerHorsCharges: this.formDoc.get('priceNoCharge')?.value ?? 0,
      charges: this.formDoc.get('chargePrice')?.value ?? 0,
      garantieType: this.formDoc.get('garantieType')?.value ?? null,
    };
  }

  /** Le destinataire du bail, tel que la modale de relecture le nomme. */
  get nomLocataireSaisi(): string {
    return [
      this.formDoc.get('firstname')?.value,
      this.formDoc.get('name')?.value,
    ]
      .filter(Boolean)
      .join(' ');
  }

  get emailLocataireSaisi(): string | null {
    return this.formDoc.get('email')?.value || null;
  }

  /**
   * Envoi du bail au locataire, puis suite du parcours. L'ordre compte : le
   * mail part d'abord, la fiche locataire ensuite, et l'horodatage en dernier —
   * il a besoin de l'id que la création vient de rendre.
   */
  envoyerBail(corpsMail: string) {
    const resultat = this.resultatGeneration;
    const destinataire = this.destinataireBail();
    const email = this.emailLocataireSaisi;
    if (!resultat || !email || !destinataire) {
      return;
    }

    // Un nouvel essai repart d'un écran propre : l'échec précédent ne doit pas
    // rester affiché au-dessus d'un envoi qui, cette fois, aboutit.
    this.messageErreur = null;
    this.envoiEnCours = true;

    this.bailEnvoiService
      .envoyerBail(destinataire, this.documentsAEnvoyer(resultat), corpsMail)
      .subscribe({
        next: () => {
          this.envoiEnCours = false;
          this.fermerRelecture();
          this.apresGeneration(resultat, `Le bail a été envoyé à ${email}.`);
        },
        error: (err) => {
          console.error("Erreur lors de l'envoi du bail", err);
          this.envoiEnCours = false;
          // Le bail est généré et enregistré : l'échec du mail ne doit pas
          // annuler le reste. La modale reste ouverte, l'envoi se retente ou se
          // remplace par un téléchargement.
          this.messageErreur = messageErreurHttp(
            err,
            "L'envoi du bail a échoué. Le bail est généré : téléchargez-le ou réessayez",
          );
        },
      });
  }

  /** Le bail et son annexe, quand elle a pu être produite. */
  private documentsAEnvoyer(resultat: ResultatGeneration): DocumentGenere[] {
    return resultat.annexe
      ? [resultat.bail, resultat.annexe]
      : [resultat.bail];
  }

  /**
   * Le comportement d'avant l'envoi par mail : les `.docx` produits partent au
   * navigateur — le bail, et l'annexe quand elle a pu être générée.
   */
  telechargerBail() {
    const resultat = this.resultatGeneration;
    if (!resultat) {
      return;
    }

    for (const document of this.documentsAEnvoyer(resultat)) {
      telechargerFichier(document.fichier, document.nomFichier);
    }

    this.fermerRelecture();
    this.apresGeneration(resultat);
  }

  /**
   * Ni envoi ni téléchargement : le bail reste dans l'historique et la fiche
   * candidat offre de l'envoyer plus tard, une fois relu dans Word.
   */
  abandonnerRelecture() {
    const resultat = this.resultatGeneration;
    if (!resultat) {
      return;
    }

    this.fermerRelecture();
    this.apresGeneration(resultat);
  }

  private fermerRelecture() {
    this.resultatGeneration = null;
    this.apercuBail = null;
  }

  /**
   * Enregistre la saisie sans rien produire d'autre : ni document, ni fiche
   * locataire, une seule ligne dans `result_form`. Aucun champ n'est exigé,
   * c'est tout l'intérêt de mettre un bail de côté avant de l'avoir fini.
   */
  onSave() {
    this.messageSucces = null;
    this.messageErreur = null;
    this.isSaving = true;

    const brouillon = this.construireBrouillon();
    const enregistrement =
      this.brouillonId == null
        ? this.requestService.creerBrouillon(brouillon)
        : this.requestService.majBrouillon(this.brouillonId, brouillon);

    enregistrement.subscribe({
      next: (saisie) => {
        this.brouillonId = saisie.id;
        this.isSaving = false;
        this.messageSucces =
          'Saisie enregistrée. Vous la retrouverez dans l’historique, rubrique « Saisies en cours ».';
      },
      error: (err) => {
        console.error('Saisie non enregistrée', err);
        this.isSaving = false;
        this.messageErreur = messageErreurHttp(
          err,
          "La saisie n'a pas pu être enregistrée",
        );
      },
    });
  }

  /** Les champs obligatoires encore vides, sous leur libellé d'écran. */
  private champsManquants(): string[] {
    return Object.keys(this.formDoc.controls)
      .filter((nom) => this.formDoc.get(nom)?.invalid)
      .map((nom) => LIBELLES_CHAMPS[nom] ?? nom);
  }

  /** Recopie le formulaire dans le `resultForm` que consomme la génération. */
  private alimenterResultForm() {
    this.resultForm.adress = this.formDoc.get('adress')?.value;
    const appartement = this.formDoc.get('appartement')?.value;
    if (appartement != null) {
      this.resultForm.appartement = appartement;
    }

    const chargePriceValue = this.formDoc.get('chargePrice')?.value;
    this.resultForm.chargePrice =
      chargePriceValue !== null && chargePriceValue !== undefined
        ? chargePriceValue
        : 0;
    this.resultForm.email = this.formDoc.get('email')?.value;
    this.resultForm.firstname = this.formDoc.get('firstname')?.value;
    this.resultForm.from = new Date(this.formDoc.get('from')?.getRawValue());

    this.resultForm.motif = this.formDoc.get('motif')?.value;
    this.resultForm.name = this.formDoc.get('name')?.value;
    const priceNoChargeValue = this.formDoc.get('priceNoCharge')?.value;
    this.resultForm.priceNoCharge =
      priceNoChargeValue !== null && priceNoChargeValue !== undefined
        ? priceNoChargeValue
        : 0;

    this.resultForm.room = this.formDoc.get('room')?.value;
    this.resultForm.telephone = this.formDoc.get('telephone')?.value;
    this.resultForm.bailleur = this.bailleurSelected;
    this.resultForm.bailType = this.formDoc.get('typeBail')?.value;
    this.resultForm.tIrl = this.formDoc.get('tIrl')?.value;
    this.resultForm.valIrl = this.formDoc.get('valIrl')?.value;
    this.resultForm.chargeList = this.formDoc.get('chargeList')?.value;
    this.resultForm.lastPriceWithoutCharge = this.formDoc.get(
      'lastPriceWithoutCharge',
    )?.value;
    this.resultForm.clauseLess6Month =
      this.formDoc.get('clauseLess6Month')?.value;
    this.resultForm.rentRef = this.formDoc.get('rentRef')?.value;
    this.resultForm.rentRefMaj = this.formDoc.get('rentRefMaj')?.value;
    // cas particulier pour les bails étudiants
    if (this.formDoc.get('typeBail')?.value == 'Etudiant') {
      let dateFrom = new Date(this.formDoc.get('from')?.getRawValue());
      let futureDate = new Date(dateFrom);

      futureDate.setMonth(dateFrom.getMonth() + 9);

      this.resultForm.to = new Date(futureDate.setDate(dateFrom.getDate() - 1));
    } else {
      this.resultForm.to = new Date(this.formDoc.get('to')?.getRawValue());
    }
    this.resultForm.typeResidence = this.formDoc.get('typeResidence')?.value;
    this.resultForm.garantieType = this.formDoc.get('garantieType')?.value;
  }

  /**
   * Le formulaire tel qu'il est, champs vides compris : une saisie mise de côté
   * n'a pas à être valide. Les dates partent en « AAAA-MM-JJ », telles que les
   * rend le champ date et telle que la colonne les attend.
   */
  private construireBrouillon(): BrouillonPayload {
    const valeurs = this.formDoc.getRawValue() as any;
    const appartement = valeurs.appartement as AppartementDto | null;

    return {
      adress: valeurs.adress || null,
      appartement:
        appartement?.id != null ? { id: Number(appartement.id) } : null,
      bailleur:
        this.bailleurSelected?.id != null
          ? { id: Number(this.bailleurSelected.id) }
          : null,
      chargePrice: valeurs.chargePrice ?? null,
      email: valeurs.email || null,
      firstname: valeurs.firstname || null,
      from: valeurs.from || null,
      to: valeurs.to || null,
      motif: valeurs.motif || null,
      name: valeurs.name || null,
      priceNoCharge: valeurs.priceNoCharge ?? null,
      room: valeurs.room || null,
      telephone: valeurs.telephone || null,
      bailType: valeurs.typeBail || null,
      tIrl: valeurs.tIrl || null,
      valIrl: valeurs.valIrl || null,
      lastPriceWithoutCharge: valeurs.lastPriceWithoutCharge ?? null,
      chargeList: valeurs.chargeList ?? false,
      clauseLess6Month: valeurs.clauseLess6Month ?? false,
      typeResidence: valeurs.typeResidence || null,
      garantieType: valeurs.garantieType || null,
      rentRef: valeurs.rentRef ?? null,
      rentRefMaj: valeurs.rentRefMaj ?? null,
    };
  }

  /**
   * Le bail est produit et son historique écrit : reste la fiche locataire,
   * puis le retour à l'historique. La navigation attend la fiche, c'est le
   * dernier moment où son échec peut encore être signalé.
   */
  private apresGeneration(
    resultat: ResultatGeneration,
    messageEnvoi: string | null = null,
  ) {
    this.oublierBrouillonGenere();
    this.saveLocataire(
      resultat.generation?.resultForm?.id,
      resultat.avertissementAnnexe,
      messageEnvoi,
    );
  }

  /**
   * Enregistre le locataire saisi, rattaché à l'appartement sélectionné et au
   * bail qui vient d'être généré. Son échec n'annule rien — le bail est produit,
   * et parfois déjà envoyé — mais il est rapporté : la fiche est à créer à la
   * main.
   *
   * `messageEnvoi` dit que le mail est parti : la fiche qui naît ici porte alors
   * la date d'envoi, qui a besoin de l'id que la création vient de rendre.
   */
  private saveLocataire(
    resultFormId: number | undefined,
    avertissementAnnexe: string | null,
    messageEnvoi: string | null = null,
  ) {
    const appartement = this.formDoc.get('appartement')?.value as
      | AppartementDto
      | null
      | undefined;

    if (!appartement?.id) {
      console.error('Aucun appartement sélectionné, locataire non enregistré');
      this.retourHistorique(
        messageEnvoi,
        avertissementAnnexe,
        "Aucun appartement n'était sélectionné : la fiche locataire n'a pas été créée.",
      );
      return;
    }

    // L'API refuse une création sans bail d'origine : inutile d'appeler.
    if (resultFormId == null) {
      console.error(
        'Aucun bail enregistré pour cette génération, locataire non enregistré',
      );
      this.retourHistorique(
        messageEnvoi,
        avertissementAnnexe,
        "Le bail n'a pas été rattaché à l'historique : la fiche locataire n'a pas été créée.",
      );
      return;
    }

    const locataire: LocataireDto = {
      nom: this.formDoc.get('name')?.value ?? '',
      prenom: this.formDoc.get('firstname')?.value ?? '',
      telephone: this.formDoc.get('telephone')?.value || null,
      email: this.formDoc.get('email')?.value || null,
      dateNaissance: this.formDoc.get('dateNaissance')?.value || null,
      profession: this.formDoc.get('profession')?.value || null,
      appartementId: Number(appartement.id),
      resultFormId: Number(resultFormId),
    };

    this.requestService.addLocataire(locataire).subscribe({
      next: (cree) => {
        if (messageEnvoi && cree.id != null) {
          this.horodaterEnvoi(cree.id, messageEnvoi, avertissementAnnexe);
          return;
        }

        this.retourHistorique(messageEnvoi, avertissementAnnexe);
      },
      error: (err) => {
        console.error("Erreur lors de l'enregistrement du locataire", err);
        this.retourHistorique(
          messageEnvoi,
          avertissementAnnexe,
          messageErreurHttp(err, "La fiche locataire n'a pas pu être créée"),
        );
      },
    });
  }

  /**
   * Pose la date d'envoi sur la fiche qui vient de naître. Le mail est déjà
   * parti : son échec d'horodatage ne doit pas se présenter comme un échec
   * d'envoi, on le signale à part — même partage que la résiliation.
   */
  private horodaterEnvoi(
    locataireId: number,
    messageEnvoi: string,
    avertissementAnnexe: string | null,
  ) {
    this.requestService.marquerBailEnvoye(locataireId).subscribe({
      next: () => this.retourHistorique(messageEnvoi, avertissementAnnexe),
      error: (err) => {
        console.error('Bail envoyé mais non horodaté', err);
        this.retourHistorique(
          messageEnvoi,
          avertissementAnnexe,
          "L'envoi n'a pas pu être enregistré : la fiche du candidat ne l'affichera pas.",
        );
      },
    });
  }

  /**
   * La génération est déjà écrite dans l'historique quand on arrive ici : la
   * liste affichée contiendra donc ce bail, avec ce qui a échoué autour.
   *
   * `messageEnvoi` prolonge le succès plutôt que de le remplacer : le bail a
   * bien été généré, et en plus il est parti.
   */
  private retourHistorique(
    messageEnvoi: string | null,
    ...avertissements: (string | null)[]
  ) {
    this.isGenerating = false;
    const messageAvertissement = avertissements.filter(Boolean).join(' ');

    this.router.navigate(['/history'], {
      state: {
        messageSucces: ['Le bail a bien été généré.', messageEnvoi]
          .filter(Boolean)
          .join(' '),
        messageAvertissement: messageAvertissement || null,
      },
    });
  }

  /**
   * La saisie mise de côté vient de produire son bail : la garder en brouillon
   * ferait réapparaître dans la liste un formulaire déjà généré. Sa suppression
   * n'a rien de bloquant, le bail est fait.
   */
  private oublierBrouillonGenere() {
    if (this.brouillonId == null) {
      return;
    }

    const id = this.brouillonId;
    this.brouillonId = null;
    this.requestService.supprimerBrouillon(id).subscribe({
      error: (err) => console.error('Saisie en cours non supprimée', err),
    });
  }

  switchRooms(rooms: Chambre[], bailleur: any, appartement: AppartementDto) {
    console.log(appartement);
    this.chambres = rooms;
    this.pieces = rooms.map((chambre) => chambre.piece!);
    this.bailleurSelected = bailleur;
    console.log(bailleur);
    this.appartementSelected = appartement;
    this.formDoc.patchValue({
      rentRef: appartement.rentRef,
      rentRefMaj: appartement.rentRefMaj,
      tIrl: appartement.tIrl,
      valIrl: appartement.valIrl,
    });
  }

  isMobilite(typBail: string) {
    console.log(typBail);
    typBail == 'Indéterminé'
      ? this.formDoc.get('to')?.disable()
      : this.formDoc.get('to')?.enable();
    this.typBailSelected = typBail;
  }

  sentValIrlTirl(
    value: string | null | undefined,
    fieldName: 'valIrl' | 'tIrl',
  ) {
    console.log(value, fieldName, this.appartementSelected?.id);

    const otherField: 'valIrl' | 'tIrl' =
      fieldName === 'valIrl' ? 'tIrl' : 'valIrl';
    if (this.formDoc.get(fieldName)?.enabled === false) {
      if (fieldName == 'valIrl') {
        this.modifyValIrl = true;
      } else {
        this.modifyTirl = true;
      }
      this.formDoc.disable();
      this.formDoc.get(fieldName)?.enable();

      return;
    }
    if (this.formDoc.get(fieldName)?.enabled === true) {
      console.log('helloSave', fieldName);
      if (fieldName == 'valIrl') {
        this.modifyValIrl = false;
      } else {
        this.modifyTirl = false;
      }
      this.requestService.setValIrlTirl(fieldName, value).subscribe((data) => {
        this.loadAppartements();
      });
      this.formDoc.enable();

      this.formDoc.get(fieldName)?.disable();
      this.formDoc.get(otherField)?.disable();
      this.formDoc.get('rentRef')?.disable();
      this.formDoc.get('rentRefMaj')?.disable();
    }
  }

  setRentRef(
    value: number | null | undefined,
    fieldName: 'rentRef' | 'rentRefMaj',
  ) {
    const otherField: 'rentRef' | 'rentRefMaj' =
      fieldName === 'rentRef' ? 'rentRefMaj' : 'rentRef';
    if (this.formDoc.get(fieldName)?.enabled === false) {
      if (fieldName == 'rentRef') {
        this.modifyRentRef = true;
      } else {
        this.modifyRentRefMaj = true;
      }
      this.formDoc.disable();
      this.formDoc.get(fieldName)?.enable();

      return;
    }
    if (this.formDoc.get(fieldName)?.enabled === true) {
      console.log('helloSave', fieldName);
      if (fieldName == 'rentRef') {
        this.modifyRentRef = false;
      } else {
        this.modifyRentRefMaj = false;
      }
      this.requestService
        .setRentRef(this.appartementSelected?.id, fieldName, value)
        .subscribe((data) => {});
      this.formDoc.enable();

      this.formDoc.get(fieldName)?.disable();
      this.formDoc.get(otherField)?.disable();
      this.formDoc.get('valIrl')?.disable();
      this.formDoc.get('tIrl')?.disable();
    }
  }

  isInvalid(fieldName: string): boolean {
    const fieldControl = this.formDoc.get(fieldName);
    if (!fieldControl) {
      return false;
    }
    return (
      (fieldControl?.invalid && this.isSubmit) ||
      (fieldControl.invalid && fieldControl.touched)
    );
  }
  loadAppartements() {
    this.isLoading = true;
    this.requestService.getAppartements().subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.appartments = data;
        } else {
          console.error('Données invalides reçues', data);
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement', err);
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
