import { AppartementDto } from './AppartementDto.model';

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'select' | 'time' | 'radio' | 'date' | 'checkbox';
  label: string;
  validators?: any[];
  items?: any;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}
