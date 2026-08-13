import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { LocataireDto } from '../../model/LocataireDto.model';
import { QuittanceOptions, QuittanceService } from '../../service/quittance.service';

/**
 * Nombre de mois qu'une même saisie peut couvrir. Chaque mois produit une
 * quittance, et l'API n'accepte pas plus de douze pièces jointes par mail.
 */
const MAX_MOIS = 12;

/** Jour d'échéance habituel du loyer, proposé par défaut à la saisie. */
const JOUR_PAIEMENT = '05';

/**
 * Paramétrage des quittances de loyer : la période couverte, les montants et
 * la date de paiement. La période se choisit au mois — une quittance couvre un
 * mois entier — d'où deux champs « month » plutôt que deux dates libres. Une
 * période de plusieurs mois produit autant de quittances distinctes.
 */
@Component({
    selector: 'app-quittance-modal',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './quittance-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./quittance-modal.component.scss']
})
export class QuittanceModalComponent implements OnInit {
  @Input() locataire: LocataireDto | null = null;
  /** Une génération en cours verrouille les boutons sans fermer la modale. */
  @Input() traitementEnCours = false;
  @Output() telecharger = new EventEmitter<QuittanceOptions>();
  @Output() envoyer = new EventEmitter<QuittanceOptions>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private quittanceService: QuittanceService,
  ) {
    this.form = this.fb.group(
      {
        moisDebut: ['', Validators.required],
        moisFin: ['', Validators.required],
        datePaiement: ['', Validators.required],
      },
      { validators: [periodeCroissante, periodeBornee] },
    );
  }

  /** Rappelé dans le message d'erreur de période trop longue. */
  readonly maxMois = MAX_MOIS;

  ngOnInit(): void {
    // La quittance se délivre pour le mois qui vient d'être réglé : le mois
    // courant, réglé au 5 comme le veut l'échéance habituelle. Le tout reste
    // modifiable.
    const moisCourant = this.moisIso(new Date());

    this.form.patchValue({
      moisDebut: moisCourant,
      moisFin: moisCourant,
      datePaiement: `${moisCourant}-${JOUR_PAIEMENT}`,
    });
  }

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Les mois couverts par la saisie, un par quittance à produire. Vide tant que
   * la période n'est pas exploitable, ce qui masque le récapitulatif.
   */
  get moisCouverts(): string[] {
    const { moisDebut, moisFin } = this.form.value;
    if (!moisDebut || !moisFin || this.form.hasError('periodeInversee')) {
      return [];
    }

    return this.quittanceService.moisDeLaPeriode({
      moisDebut,
      moisFin,
      datePaiement: '',
    });
  }

  /**
   * « du 01/01/2026 au 31/01/2026 » pour un mois donné : le détail de ce que
   * portera chaque document, recalculé à chaque saisie.
   */
  periodeDuMois(mois: string): string {
    return `du ${this.quittanceService.debutPeriode(mois)} au ${this.quittanceService.finPeriode(mois)}`;
  }

  libelleMois(mois: string): string {
    return this.quittanceService.libelleMois(mois);
  }

  /** Montants du bail signé, repris tels quels : ils ne se saisissent pas. */
  get loyerHorsCharges(): number {
    return this.locataire?.loyerHorsCharges ?? 0;
  }

  get charges(): number {
    return this.locataire?.charges ?? 0;
  }

  get total(): number {
    return this.loyerHorsCharges + this.charges;
  }

  /**
   * Un locataire sans bail rattaché n'a pas de montants : la quittance sortirait
   * à 0,00 €, autant l'annoncer et bloquer la génération.
   */
  get montantsConnus(): boolean {
    return (
      this.locataire?.loyerHorsCharges != null || this.locataire?.charges != null
    );
  }

  /** Sans adresse email, la quittance ne peut qu'être téléchargée. */
  get peutEnvoyer(): boolean {
    return !!this.locataire?.email;
  }

  onTelecharger() {
    this.emettre(this.telecharger);
  }

  onEnvoyer() {
    if (this.peutEnvoyer) {
      this.emettre(this.envoyer);
    }
  }

  onCancel() {
    if (!this.traitementEnCours) {
      this.cancel.emit();
    }
  }

  private emettre(sortie: EventEmitter<QuittanceOptions>) {
    if (this.form.invalid || this.traitementEnCours || !this.montantsConnus) {
      this.form.markAllAsTouched();
      return;
    }

    const { moisDebut, moisFin, datePaiement } = this.form.value;

    sortie.emit({ moisDebut, moisFin, datePaiement });
  }

  /** `<input type="month">` attend « AAAA-MM ». */
  private moisIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * « AAAA-MM » se compare comme du texte : un mois de fin antérieur au mois de
 * début produirait une période à l'envers dans la quittance.
 */
function periodeCroissante(form: AbstractControl): ValidationErrors | null {
  const moisDebut = form.get('moisDebut')?.value;
  const moisFin = form.get('moisFin')?.value;

  return moisDebut && moisFin && moisFin < moisDebut
    ? { periodeInversee: true }
    : null;
}

/**
 * Chaque mois de la période part en pièce jointe : au-delà de douze, le mail
 * serait refusé par l'API. Mieux vaut le dire au moment de la saisie qu'à
 * l'envoi.
 */
function periodeBornee(form: AbstractControl): ValidationErrors | null {
  const moisDebut: string = form.get('moisDebut')?.value;
  const moisFin: string = form.get('moisFin')?.value;
  if (!moisDebut || !moisFin || moisFin < moisDebut) {
    return null;
  }

  const [anneeDebut, debut] = moisDebut.split('-').map(Number);
  const [anneeFin, fin] = moisFin.split('-').map(Number);
  const nombreMois = (anneeFin * 12 + fin) - (anneeDebut * 12 + debut) + 1;

  return nombreMois > MAX_MOIS ? { periodeTropLongue: true } : null;
}
