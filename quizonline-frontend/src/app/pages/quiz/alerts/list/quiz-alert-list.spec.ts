import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {QuizAlertList} from './quiz-alert-list';
import {QuizAlertService} from '../../../../services/quiz-alert/quiz-alert';
import {UserService} from '../../../../services/user/user';

describe('QuizAlertList', () => {
  let fixture: ComponentFixture<QuizAlertList>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizAlertList],
      providers: [
        provideRouter([]),
        {provide: QuizAlertService, useValue: {list: () => of([])}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizAlertList);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
