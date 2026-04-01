import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {ResetPasswordConfirm} from './reset-password-confirm';
import {AuthService} from '../../../services/auth/auth';

describe('ResetPasswordConfirm', () => {
  let component: ResetPasswordConfirm;
  let fixture: ComponentFixture<ResetPasswordConfirm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordConfirm],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({uid: 'abc', token: 'def'})),
          },
        },
        {
          provide: AuthService,
          useValue: {
            confirmPasswordReset: () => of({detail: 'ok'}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordConfirm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
