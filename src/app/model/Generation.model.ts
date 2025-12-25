import { ResultForm } from './resultForm.model';

export class Generation {
  id?: string;
  date: Date;
  appartementName: string;
  locataireName: string;
  resultForm: ResultForm;

  constructor(
    date: Date,
    appartementName: string,
    locataireName: string,
    resultForm: ResultForm,
    id?: string
  ) {
    this.date = date;
    this.appartementName = appartementName;
    this.locataireName = locataireName;
    this.resultForm = resultForm;
    this.id = id;
  }
}
