import { TestBed } from '@angular/core/testing';

import { Background } from './background';

describe('Background', () => {
  let service: Background;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Background);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
