import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {provideRouter} from '@angular/router';
import {RegisterPendingPage} from './register-pending';
import {UserService} from '../../../services/user/user';

describe('RegisterPendingPage', () => {
  let fixture: ComponentFixture<RegisterPendingPage>;
  beforeEach(async () => {
    (window as any).__APP__ = {name: 'Test'};
    await TestBed.configureTestingModule({
      imports: [RegisterPendingPage],
      providers: [
        provideRouter([]),
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterPendingPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
