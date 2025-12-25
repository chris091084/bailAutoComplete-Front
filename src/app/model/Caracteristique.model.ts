export class Caracteristique {
  id?: number;
  description: string;

  constructor(description: string, id?: number) {
    this.description = description;
    this.id = id;
  }
}
