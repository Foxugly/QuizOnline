import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {QuizTemplateResultsPage} from './quiz-template-results';
import {QuizService} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';

describe('QuizTemplateResultsPage', () => {
  let fixture: ComponentFixture<QuizTemplateResultsPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateResultsPage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {paramMap: of({get: () => '1'}), snapshot: {paramMap: {get: () => '1'}}}},
        {provide: QuizService, useValue: {listTemplateSessions: () => of([]), listTemplates: () => of([]), goList: () => {}, goView: () => {}}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateResultsPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
