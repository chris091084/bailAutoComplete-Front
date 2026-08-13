import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberOfDays',
  standalone: true,
})
export class NumberOfDays implements PipeTransform {
  transform(mois: number, year: number): number {
    return new Date(year, mois, 0).getDate();
  }
}
