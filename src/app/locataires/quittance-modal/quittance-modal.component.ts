import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
 * Paramétrage d'une quittance de loyer : la période couverte, les montants et
 * la date de paiement. La période se choisit au mois — une quittance couvre des
 * mois entiers — d'où deux champs « month » plutôt que deux dates libres.
 */
@Component({
  selector: 'app-quittance-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quittance-modal.component.html',
  styleUrls: ['./quittance-modal.component.scss'],
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
      { validators: [periodeCroissante] },
    );
  }

  ngOnInit(): void {
    // La quittance se délivre pour le mois qui vient d'être réglé : le mois
    // courant et la date du jour sont le cas courant, et restent modifiables.
    const moisCourant = this.moisIso(new Date());

    this.form.patchValue({
      moisDebut: moisCourant,
      moisFin: moisCourant,
      datePaiement: this.jourIso(new Date()),
    });
  }

  get nomComplet(): string {
    return [this.locataire?.prenom, this.locataire?.nom]
      .filter(Boolean)
      .join(' ');
  }

  /** « Période du 01/01/2026 au 31/01/2026 », recalculée à chaque saisie. */
  get libellePeriode(): string {
    const { moisDebut, moisFin } = this.form.value;
    if (!moisDebut || !moisFin || this.form.hasError('periodeInversee')) {
      return '';
    }

    return `du ${this.quittanceService.debutPeriode(moisDebut)} au ${this.quittanceService.finPeriode(moisFin)}`;
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

  /** `<input type="date">` attend « AAAA-MM-JJ », en heure locale. */
  private jourIso(date: Date): string {
    return `${this.moisIso(date)}-${String(date.getDate()).padStart(2, '0')}`;
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
