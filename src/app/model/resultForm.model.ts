import { Appartement } from './appartement.model';
import { Bailleur } from './bailleur.model';

export class ResultForm {
  adress?: string | null;
  appartement?: Appartement | null;
  chargePrice: number = 0;
  email?: string | null;
  firstname?: string | null;
  from: Date = new Date();
  to?: string | null;
  motif?: string | null;
  name?: string | null;
  priceNoCharge: number = 0;
  room?: string | null;
  telephone?: string | null;
  bailleur?: Bailleur | null;
  bailType?: string | null;
  irl?: string | null;
}
