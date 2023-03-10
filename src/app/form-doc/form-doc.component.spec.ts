import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormDocComponent } from './form-doc.component';

describe('FormDocComponent', () => {
  let component: FormDocComponent;
  let fixture: ComponentFixture<FormDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FormDocComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
