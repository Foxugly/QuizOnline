import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {QuizTemplateDelete} from './quiz-template-delete';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {UserService} from '../../../services/user/user';

describe('QuizTemplateDelete', () => {
  let fixture: ComponentFixture<QuizTemplateDelete>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateDelete],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: QuizService, useValue: {listTemplates: () => of([]), goList: () => {}}},
        {provide: QuizTemplateService, useValue: {retrieve: () => of({}), delete: () => of(null)}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateDelete);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
