import { ComponentFixture, TestBed } from '@angular/core/testing';
import {MessageService} from 'primeng/api';

import { DomainList } from './domain-list';

describe('DomainList', () => {
  let component: DomainList;
  let fixture: ComponentFixture<DomainList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainList],
      providers: [MessageService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DomainList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
