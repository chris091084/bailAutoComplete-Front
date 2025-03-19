import { Component, EventEmitter, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormDocComponent } from '../form-doc/form-doc.component';
import { ResultForm } from '../model/resultForm.model';
import { Appartement } from '../model/appartement.model';
import * as PizZip from 'pizzip';
import * as Docxtemplater from 'docxtemplater';
import * as saveAs from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { DateLeft } from '../pipe/dateLeft.pipe';
import { emitDistinctChangesOnlyDefaultValue } from '@angular/compiler';

@Component({
  selector: 'app-bail-doc',
  templateUrl: './bail-doc.component.html',
  styleUrls: ['./bail-doc.component.scss'],
})
export class BailDocComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
