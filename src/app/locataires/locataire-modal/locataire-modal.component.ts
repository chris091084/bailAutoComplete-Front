import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LocataireDto } from '../../model/LocataireDto.model';
import { RequestService } from '../../service/requestService';

@Component({
  selector: 'app-locataire-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './locataire-modal.component.html',
  styleUrls: ['./locataire-modal.component.scss'],
})
export class LocataireModalComponent implements OnInit {
  @Input() locataire: LocataireDto | null = null;
  @Output() save = new EventEmitter<LocataireDto>();
  @Output() cancel = new EventEmitter<void>();

  // AppartementDto type son id en `string` alors que l'API renvoie un nombre :
  // les options sont normalisées ici pour que la comparaison avec
  // `appartementId` (un nombre) sélectionne bien la ligne en édition.
  appartementsOptions: { id: number; label: string }[] = [];

  // Les result_form ne sont exposés qu'à travers leurs générations : on y prend
  // l'id du formulaire, mais le libellé vient de la génération, seule à porter
  // les noms d'appartement et de locataire.
  resultFormsOptions: { id: number; label: string }[] = [];

  /** Bornes de l'année de naissance, alignées sur celles que l'API vérifie. */
  readonly anneeNaissanceMin = 1900;
  readonly anneeCourante = new Date().getFullYear();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService
  ) {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      telephone: [''],
      email: ['', Validators.email],
      anneeNaissance: [
        null,
        [
          Validators.min(this.anneeNaissanceMin),
          Validators.max(this.anneeCourante),
        ],
      ],
      entree: [null],
      appartementId: [null, Validators.required],
      resultFormId: [null],
    });
  }

  ngOnInit(): void {
    // Modale d'édition uniquement : la création d'un locataire passe par la
    // génération d'un bail. Sans locataire à modifier, on referme.
    if (!this.locataire?.id) {
      this.cancel.emit();
      return;
    }

    this.loadAppartements();
    this.loadResultForms();
    this.form.patchValue(this.locataire);
  }

  loadAppartements() {
    this.requestService.getAppartements().subscribe({
      next: (data) => {
        this.appartementsOptions = (data ?? []).map((appartement) => ({
          id: Number(appartement.id),
          label: appartement.name,
        }));
      },
      error: (err) => console.error('Error fetching appartements', err),
    });
  }

  loadResultForms() {
    this.requestService.getGenerations().subscribe({
      next: (data) => {
        this.resultFormsOptions = (data ?? [])
          .filter((generation) => generation?.resultForm?.id != null)
          .map((generation) => ({
            id: Number(generation.resultForm.id),
            label: this.libelleResultForm(generation),
          }))
          // Les générations arrivent dans l'ordre d'insertion : la plus récente
          // en tête évite de dérouler toute la liste pour un bail signé hier.
          .reverse();
      },
      error: (err) => console.error('Error fetching generations', err),
    });
  }

  onSubmit() {
    if (this.form.valid && this.locataire?.id) {
      const formValue = this.form.value;
      const result: LocataireDto = {
        id: this.locataire.id,
        nom: formValue.nom,
        prenom: formValue.prenom,
        telephone: formValue.telephone || null,
        email: formValue.email || null,
        // Champ vidé : `null` explicite, l'API distingue « effacer » de
        // « ne pas toucher au champ ».
        anneeNaissance: formValue.anneeNaissance
          ? Number(formValue.anneeNaissance)
          : null,
        entree: formValue.entree || null,
        appartementId: Number(formValue.appartementId),
        // `null` explicite plutôt qu'omis : l'API distingue « détacher » de
        // « ne pas toucher à la liaison ».
        resultFormId:
          formValue.resultFormId != null ? Number(formValue.resultFormId) : null,
      };
      this.save.emit(result);
    }
  }

  /** « 12/03/2024 — Bail signé le 01/03/2024 (Studio Filature, Dupont) ». */
  private libelleResultForm(generation: any): string {
    const signature = generation?.resultForm?.from;
    const parties = [
      generation?.appartementName,
      generation?.locataireName,
    ].filter(Boolean);

    return [
      signature ? `Bail du ${this.formaterDateIso(signature)}` : 'Bail',
      parties.length ? `(${parties.join(', ')})` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  /** « AAAA-MM-JJ » (colonne `date`) -> « JJ/MM/AAAA ». */
  private formaterDateIso(date: string): string {
    const iso = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : String(date);
  }

  onCancel() {
    this.cancel.emit();
  }
}
