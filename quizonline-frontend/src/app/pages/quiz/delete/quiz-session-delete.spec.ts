import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {QuizSessionDeletePage} from './quiz-session-delete';
import {QuizService} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';

describe('QuizSessionDeletePage', () => {
  let fixture: ComponentFixture<QuizSessionDeletePage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizSessionDeletePage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: QuizService, useValue: {retrieveQuiz: () => of({}), deleteQuiz: () => of(null)}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizSessionDeletePage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
