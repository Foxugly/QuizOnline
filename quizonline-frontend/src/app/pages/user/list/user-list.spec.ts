import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {UserListPage} from './user-list';
import {UserService} from '../../../services/user/user';

describe('UserListPage', () => {
  let fixture: ComponentFixture<UserListPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListPage],
      providers: [
        provideRouter([]),
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false, listAdmin: () => of([])}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserListPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
