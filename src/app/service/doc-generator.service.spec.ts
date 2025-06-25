import { TestBed } from '@angular/core/testing';

import { DocGeneratorService } from './doc-generator.service';

describe('DocGeneratorService', () => {
  let service: DocGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
