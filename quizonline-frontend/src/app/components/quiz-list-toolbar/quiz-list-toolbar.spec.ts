import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {QuizListToolbarComponent} from './quiz-list-toolbar';
import {UserService} from '../../services/user/user';

describe('QuizListToolbarComponent', () => {
  let fixture: ComponentFixture<QuizListToolbarComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizListToolbarComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizListToolbarComponent);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
