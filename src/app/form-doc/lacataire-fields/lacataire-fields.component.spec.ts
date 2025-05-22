import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LacataireFieldsComponent } from './lacataire-fields.component';

describe('LacataireFieldsComponent', () => {
  let component: LacataireFieldsComponent;
  let fixture: ComponentFixture<LacataireFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LacataireFieldsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LacataireFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
