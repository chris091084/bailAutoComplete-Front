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
}
