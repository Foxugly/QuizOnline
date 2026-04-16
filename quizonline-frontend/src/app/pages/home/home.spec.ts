import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {Home} from './home';
import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

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
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
          },
        },
        {
          provide: UserService,
          useValue: {
            isAdmin: () => false,
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
