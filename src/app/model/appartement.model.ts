import { Bailleur } from './bailleur.model';

export class Appartement {
  name?: string;
  bailleur?: Bailleur;
  adresse?: string;
  chambres?: string[];
  caracteristiques?: string[];
  energieWater?: string;
  energieHeating?: string;
  bankName?: string;
  pet?: string;
  constructionPeriod?: string;
  surface?: string;
  rentRef?: number;
  rentMaj?: number;
  constructor(
    name: string,
    bailleur: Bailleur,
    adresse: string,
    chambres: string[],
    caracteristiques: string[],
    energieWater: string,
    energieHeating: string,
    bankName: string,
    pet: string,
    constructionPeriod: string,
    surface: string,
    rentRef?: number,
    rentMaj?: number
  ) {
    this.name = name;
    this.bailleur = bailleur;
    this.adresse = adresse;
    this.chambres = chambres;
    this.caracteristiques = caracteristiques;
    this.energieWater = energieWater;
    this.energieHeating = energieHeating;
    this.bankName = bankName;
    this.pet = pet;
    this.constructionPeriod = constructionPeriod;
    this.surface = surface;
    this.rentRef = rentRef;
    this.rentMaj = rentMaj;
  }
}
