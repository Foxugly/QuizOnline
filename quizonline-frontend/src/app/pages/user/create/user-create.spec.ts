import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {UserCreatePage} from './user-create';
import {UserService} from '../../../services/user/user';

describe('UserCreatePage', () => {
  let fixture: ComponentFixture<UserCreatePage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCreatePage],
      providers: [
        provideRouter([]),
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false, createAdmin: () => of({})}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserCreatePage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
