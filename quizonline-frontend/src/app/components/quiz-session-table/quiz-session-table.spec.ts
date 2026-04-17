import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {QuizSessionTableComponent} from './quiz-session-table';
import {UserService} from '../../services/user/user';

describe('QuizSessionTableComponent', () => {
  let fixture: ComponentFixture<QuizSessionTableComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizSessionTableComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizSessionTableComponent);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
