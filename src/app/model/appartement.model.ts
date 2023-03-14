import { Bailleur } from './bailleur.model';

export class Appartment {
  name?: string;
  bailleur?: Bailleur;
  adresse?: string;
  chambre?: string[];
  caracteristique?: string[];
  energie?: string;
  bankName?: string;
  pet?: string;
  constructor(
    name: string,
    bailleur: Bailleur,
    adresse: string,
    chambre: string[],
    caracteristique: string[],
    energie: string,
    bankName: string,
    pet: string
  ) {
    this.name = name;
    this.bailleur = bailleur;
    this.adresse = adresse;
    this.chambre = chambre;
    this.caracteristique = caracteristique;
    this.energie = energie;
    this.bankName = bankName;
    this.pet = pet;
  }
}
