import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {QuizQuickPage} from './quiz-quick';
import {QuizService} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';

describe('QuizQuickPage', () => {
  let fixture: ComponentFixture<QuizQuickPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQuickPage],
      providers: [
        provideRouter([]),
        {provide: QuizService, useValue: {generateQuiz: () => of({}), getQuestionCountBySubjects: () => of({count: 0}), goList: () => {}, goView: () => {}}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizQuickPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
