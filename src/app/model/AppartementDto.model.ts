import { Bailleur } from './bailleur.model';
import { Chambre } from './Chambre.model';

export interface AppartementDto {
  id: number;
  name: string;
  adress: string;
  bailleur: Bailleur;
  chambres: Chambre[];
  caracteristiques: string[];
  typeChauffage: string;
  chauffageCollectif: boolean;
  bankName: string;
  restrictions: string;
  constructionPeriod: string;
  surface: number;
  charges: number;
  loyers: number;
  caution: number;
  petRule: string;
  rentRef: number;
  rentRefMaj: number;
}
