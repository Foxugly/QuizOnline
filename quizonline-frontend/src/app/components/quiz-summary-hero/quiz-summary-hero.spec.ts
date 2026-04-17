import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {QuizSummaryHeroComponent} from './quiz-summary-hero';
import {UserService} from '../../services/user/user';

describe('QuizSummaryHeroComponent', () => {
  let fixture: ComponentFixture<QuizSummaryHeroComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizSummaryHeroComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizSummaryHeroComponent);
    fixture.componentRef.setInput('session', {id: 1, quiz_template: 1, mode: 'exam'});
    fixture.componentRef.setInput('statusLabel', 'En cours');
    fixture.componentRef.setInput('scoreLabel', '0/0');
    fixture.componentRef.setInput('scoreMetaLabel', '0%');
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
