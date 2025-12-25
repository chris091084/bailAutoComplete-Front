import { Bailleur } from './bailleur.model';
import { Chambre } from './Chambre.model';
import { Caracteristique } from './Caracteristique.model';

export interface AppartementDto {
  id: string;
  name: string;
  adress: string;
  bailleur: Bailleur;
  chambres: Chambre[];
  caracteristiques: Caracteristique[];
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
  valIrl: string;
  tIrl: string;
  energieWater: string;
  energieHeating: string;
  formName: string;
}
