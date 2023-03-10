import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BailDocComponent } from './bail-doc.component';

describe('BailDocComponent', () => {
  let component: BailDocComponent;
  let fixture: ComponentFixture<BailDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BailDocComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BailDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
