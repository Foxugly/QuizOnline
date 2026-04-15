import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {App} from './app';
import {BackendStatusService} from './services/status/status';
import {AuthService} from './services/auth/auth';
import {UserService} from './services/user/user';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: BackendStatusService,
          useValue: {
            backendUp: signal(true),
            lastError: signal(null),
          },
        },
        {
          provide: AuthService,
          useValue: {
            authenticated: false,
            isLoggedIn: () => false,
            logout: jasmine.createSpy('logout'),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentUser: signal(null),
            getMe: () => of(null),
            currentLang: 'fr',
            isAdmin: () => false,
            isSuperuser: () => false,
            setLang: jasmine.createSpy('setLang'),
            updateMeLanguage: () => of(null),
            shouldConfirmEmail: () => false,
            shouldForcePasswordChange: () => false,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render shell components', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-topmenu')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });
});
