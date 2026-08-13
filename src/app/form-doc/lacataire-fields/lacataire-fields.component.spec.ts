import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { LacataireFieldsComponent } from './lacataire-fields.component';

/**
 * Le template du composant utilise `formControlName` sans porter lui-meme de
 * `[formGroup]` : il s'appuie sur le ControlContainer fourni par le parent.
 * On le teste donc dans un hote qui reproduit ce contexte, comme le fait
 * FormDocComponent.
 */
@Component({
  imports: [ReactiveFormsModule, LacataireFieldsComponent],
  template: `
    <form [formGroup]="formDoc">
      <app-lacataire-fields
        [isInvalid]="isInvalid"
        [sentValIrlTirl]="sentValIrlTirl"
        [formDoc]="formDoc"
        [isSubmit]="false"
        [pieces]="[]"
      ></app-lacataire-fields>
    </form>
  `,
})
class HostComponent {
  formDoc = new FormGroup({
    name: new FormControl(''),
    firstname: new FormControl(''),
    email: new FormControl(''),
    telephone: new FormControl(''),
    adress: new FormControl(''),
    room: new FormControl(''),
    motif: new FormControl(''),
    from: new FormControl(''),
    to: new FormControl(''),
    tIrl: new FormControl(''),
    valIrl: new FormControl(''),
  });
  isInvalid = () => false;
  sentValIrlTirl = () => {};
}

describe('LacataireFieldsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    const component = fixture.debugElement.children[0].children[0]
      .componentInstance as LacataireFieldsComponent;
    expect(component).toBeTruthy();
  });
});
