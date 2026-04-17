import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {QuizTemplateResultsDialogComponent} from './quiz-template-results-dialog';
import {UserService} from '../../services/user/user';

describe('QuizTemplateResultsDialogComponent', () => {
  let fixture: ComponentFixture<QuizTemplateResultsDialogComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateResultsDialogComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateResultsDialogComponent);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
