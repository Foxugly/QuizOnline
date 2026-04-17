import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {QuizCreate} from './quiz-create';
import {DomainService} from '../../../services/domain/domain';
import {SubjectService} from '../../../services/subject/subject';
import {QuestionService} from '../../../services/question/question';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {QuizService} from '../../../services/quiz/quiz';
import {TranslationService} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';

describe('QuizCreate', () => {
  let fixture: ComponentFixture<QuizCreate>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizCreate],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => null}}}},
        {provide: DomainService, useValue: {list: () => of([]), retrieve: () => of({})}},
        {provide: SubjectService, useValue: {list: () => of([]), listByDomain: () => of([])}},
        {provide: QuestionService, useValue: {list: () => of([]), listByDomain: () => of([])}},
        {provide: QuizTemplateService, useValue: {retrieve: () => of({}), create: () => of({}), update: () => of({})}},
        {provide: QuizService, useValue: {listTemplates: () => of([]), goList: () => {}}},
        {provide: TranslationService, useValue: {translate: () => of({})}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizCreate);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
