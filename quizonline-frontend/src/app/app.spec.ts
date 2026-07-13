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
            currentLang: 'fr', lang: signal('fr').asReadonly(),
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

  it('renders the router outlet (shell chrome now lives in the layouts)', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // The skip-link, topmenu, <main> and footer moved to public-layout /
    // main-layout; app-root only hosts the global banner/toast + the outlet.
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-topmenu')).toBeNull();
    expect(compiled.querySelector('app-footer')).toBeNull();
  });
});
