import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {ActivatedRoute} from '@angular/router';
import {ConfirmEmailPage} from './confirm-email';
import {AuthService} from '../../../services/auth/auth';
import {UserService} from '../../../services/user/user';

describe('ConfirmEmailPage', () => {
  let fixture: ComponentFixture<ConfirmEmailPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmEmailPage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {paramMap: of({get: () => '1'}), snapshot: {paramMap: {get: () => '1'}}}},
        {provide: AuthService, useValue: {confirmEmail: () => of({detail: 'ok'})}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmEmailPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
