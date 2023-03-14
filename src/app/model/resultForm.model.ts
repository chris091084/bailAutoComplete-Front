import { Bailleur } from './bailleur.model';

export class ResultForm {
  adress?: string | null;
  appartement?: string | null;
  chargePrice?: string | null;
  email?: string | null;
  firstname?: string | null;
  from?: string | null;
  to?: string | null;
  motif?: string | null;
  name?: string | null;
  priceNoCharge?: string | null;
  room?: string | null;
  telephone?: string | null;
  bailleur?: Bailleur | null;
}
