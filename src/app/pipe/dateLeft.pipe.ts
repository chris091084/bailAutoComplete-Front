import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateLeft',
})
export class DateLeft implements PipeTransform {
  transform(dateInput: Date): number {
    const date: Date = new Date(dateInput);
    const mois: number = date.getMonth();
    const annee: number = date.getFullYear();

    const dernierJour: number = new Date(annee, mois + 1, 0).getDate();

    return dernierJour - date.getDate();
  }
}
