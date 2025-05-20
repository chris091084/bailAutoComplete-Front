import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormInterfaceComponent } from './form-interface.component';

describe('FormInterfaceComponent', () => {
  let component: FormInterfaceComponent;
  let fixture: ComponentFixture<FormInterfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FormInterfaceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
