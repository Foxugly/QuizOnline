import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {UserDeletePage} from './user-delete';
import {UserService} from '../../../services/user/user';

describe('UserDeletePage', () => {
  let fixture: ComponentFixture<UserDeletePage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDeletePage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false, retrieveAdmin: () => of({username: 'test'}), deleteAdmin: () => of(null)}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserDeletePage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
