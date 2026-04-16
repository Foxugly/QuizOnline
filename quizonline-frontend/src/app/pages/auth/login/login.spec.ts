import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {LoginPage} from './login';
import {AuthService} from '../../../services/auth/auth';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    (window as Window & {__APP__?: unknown}).__APP__ = {
      name: 'QuizOnline',
      version: 'test',
      logoSvg: 'assets/qna.svg',
      logoIco: 'assets/qna.ico',
      logoPng: 'assets/qna.png',
      author: 'Foxugly',
      year: '2026',
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: () => of({}),
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
