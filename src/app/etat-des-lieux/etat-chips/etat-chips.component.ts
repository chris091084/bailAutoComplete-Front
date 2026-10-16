import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { ETATS, EtatElement } from '../etat-des-lieux.model';

/**
 * Les cinq puces d'état (Neuf → Mauvais état), en « segmented control » : un
 * seul choix possible, de grandes zones tactiles (44 px mini).
 *
 * Se branche comme n'importe quel champ de formulaire : `[formControl]` ou
 * `formControlName`. C'est ce que fait `ControlValueAccessor` — l'interface qui
 * apprend à Angular à lire et écrire la valeur d'un composant maison.
 */
@Component({
  selector: 'app-etat-chips',
  templateUrl: './etat-chips.component.html',
  styleUrl: './etat-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EtatChipsComponent),
      multi: true,
    },
  ],
})
export class EtatChipsComponent implements ControlValueAccessor {
  readonly etats = ETATS;
  readonly valeur = signal<EtatElement | null>(null);
  readonly desactive = signal(false);

  private onChange: (valeur: EtatElement | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(valeur: EtatElement | null): void {
    this.valeur.set(valeur ?? null);
  }

  registerOnChange(fn: (valeur: EtatElement | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desactive: boolean): void {
    this.desactive.set(desactive);
  }

  choisir(valeur: EtatElement): void {
    if (this.desactive()) {
      return;
    }
    this.valeur.set(valeur);
    this.onChange(valeur);
    this.onTouched();
  }

  /**
   * Flèches gauche/droite : on passe d'une puce à l'autre comme dans un groupe
   * de boutons radio natif (une seule puce est atteignable au clavier à la fois).
   */
  naviguer(evenement: KeyboardEvent, index: number): void {
    const pas =
      evenement.key === 'ArrowRight' || evenement.key === 'ArrowDown'
        ? 1
        : evenement.key === 'ArrowLeft' || evenement.key === 'ArrowUp'
          ? -1
          : 0;
    if (pas === 0) {
      return;
    }

    evenement.preventDefault();
    const cible = (index + pas + this.etats.length) % this.etats.length;
    this.choisir(this.etats[cible].valeur);
    (
      (evenement.currentTarget as HTMLElement).parentElement?.children[
        cible
      ] as HTMLElement | undefined
    )?.focus();
  }

  /** Une seule puce porte le focus : la choisie, à défaut la première. */
  tabindex(index: number): number {
    const choisie = this.etats.findIndex((e) => e.valeur === this.valeur());
    return index === (choisie === -1 ? 0 : choisie) ? 0 : -1;
  }
}
