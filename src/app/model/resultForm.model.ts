import { Appartement } from './appartement.model';
import { Bailleur } from './bailleur.model';

export class ResultForm {
  adress?: string | null;
  appartement: Appartement = new Appartement(
    '',
    new Bailleur('', '', '', ''),
    '',
    [],
    [],
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    0,
    ''
  );
  chargePrice: number = 0;
  email?: string | null;
  firstname?: string | null;
  from: Date = new Date();
  to: Date = new Date();
  motif?: string | null;
  name?: string | null;
  priceNoCharge: number = 0;
  room?: string | null;
  telephone?: string | null;
  bailleur?: Bailleur | null;
  bailType?: string | null;
  tIrl?: string | null;
  valIrl?: string | null;
  lastPriceWithoutCharge?: number | null = 0;
  chargeList?: boolean | null = false;
  clauseLess6Month?: boolean | null = false;
  typeResidence?: string | null;
  rentRef?: number | null;
  rentRefMaj?: number | null;

  formatDate(date: Date): string {
    const day = this.addLeadingZero(date.getDate());
    const month = this.addLeadingZero(date.getMonth() + 1); // Les mois commencent à 0
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Méthode auxiliaire pour ajouter un zéro devant les jours ou mois inférieurs à 10
  private addLeadingZero(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  // Méthode pour obtenir les dates formatées
  getFormattedFromDate(): string {
    return this.formatDate(this.from);
  }

  getFormattedToDate(): string {
    return this.formatDate(this.to);
  }
}
