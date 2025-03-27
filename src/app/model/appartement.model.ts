import { Bailleur } from './bailleur.model';
import { Chambre } from './Chambre.model';

export class Appartement {
  id: string = '';
  name: string = '';
  bailleur: Bailleur;
  adress: string = '';
  chambres: Chambre[] = [];
  caracteristiques: string[] = [];
  energieWater: string = '';
  energieHeating: string = '';
  bankName: string = '';
  petRule: string = '';
  constructionPeriod: string = '';
  surface: string = '';
  rentRef: number = 0;
  rentRefMaj: number = 0;
  maxConsoElec: string = '';
  constructor(
    id: string,
    name: string,
    bailleur: Bailleur,
    adresse: string,
    chambres: Chambre[],
    caracteristiques: string[],
    energieWater: string,
    energieHeating: string,
    bankName: string,
    pet: string,
    constructionPeriod: string,
    surface: string,
    rentRef: number,
    rentMaj: number,
    maxConsoElec: string
  ) {
    this.id = id;
    this.name = name;
    this.bailleur = bailleur;
    this.adress = adresse;
    this.chambres = chambres;
    this.caracteristiques = caracteristiques;
    this.energieWater = energieWater;
    this.energieHeating = energieHeating;
    this.bankName = bankName;
    this.petRule = pet;
    this.constructionPeriod = constructionPeriod;
    this.surface = surface;
    this.rentRef = rentRef;
    this.rentRefMaj = rentMaj;
    this.maxConsoElec = maxConsoElec;
  }
}
