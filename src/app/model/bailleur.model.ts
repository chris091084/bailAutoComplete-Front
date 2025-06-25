export class Bailleur {
  name?: string;
  adress?: string;
  email?: string;
  telephone?: string;

  constructor(name: string, adress: string, email: string, telephone: string) {
    this.name = name;
    this.adress = adress;
    this.email = email;
    this.telephone = telephone;
  }
}
