import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {signal} from '@angular/core';

import {Features} from './features';
import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';

describe('Features', () => {
  let fixture: ComponentFixture<Features>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Features],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {isLoggedIn: () => false},
        },
        {
          provide: UserService,
          useValue: {currentLang: 'fr', lang: signal('fr').asReadonly(), currentUser: signal(null)},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Features);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exposes the five feature sections', () => {
    const ui = fixture.componentInstance['ui']();
    expect(ui.sections.map((s) => s.slug)).toEqual(['domains', 'subjects', 'questions', 'quizzes', 'platform']);
  });
});
