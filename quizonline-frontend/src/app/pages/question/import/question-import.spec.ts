import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {QuestionImport} from './question-import';
import {QuestionService} from '../../../services/question/question';
import {UserService} from '../../../services/user/user';
import {AppToastService} from '../../../shared/toast/app-toast.service';

describe('QuestionImport', () => {
  let fixture: ComponentFixture<QuestionImport>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionImport],
      providers: [
        provideRouter([]),
        {provide: QuestionService, useValue: {importQuestions: () => of({})}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
        {provide: AppToastService, useValue: {messages: () => [], add: () => {}, remove: () => {}}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuestionImport);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
