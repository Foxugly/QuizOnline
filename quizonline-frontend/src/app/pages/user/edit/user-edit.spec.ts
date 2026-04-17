import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {UserEditPage} from './user-edit';
import {UserService} from '../../../services/user/user';

describe('UserEditPage', () => {
  let fixture: ComponentFixture<UserEditPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserEditPage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false, retrieveAdmin: () => of({username: 'test', language: 'fr'}), updateAdmin: () => of({})}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserEditPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
