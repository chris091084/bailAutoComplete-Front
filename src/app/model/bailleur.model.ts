export class Bailleur {
  name?: string;
  adresse?: string;
  email?: string;
  telephone?: string;

  constructor(name: string, adresse: string, email: string, telephone: string) {
    this.name = name;
    this.adresse = adresse;
    this.email = email;
    this.telephone = telephone;
  }
}
