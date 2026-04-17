import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {DomainJoinRequestsPage} from './domain-join-requests';
import {DomainApi as DomainApiService} from '../../../api/generated/api/domain.service';
import {UserService} from '../../../services/user/user';

describe('DomainJoinRequestsPage', () => {
  let fixture: ComponentFixture<DomainJoinRequestsPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainJoinRequestsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: DomainApiService, useValue: {domainJoinRequestList: () => of({results: []}), domainRead: () => of({})}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DomainJoinRequestsPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
