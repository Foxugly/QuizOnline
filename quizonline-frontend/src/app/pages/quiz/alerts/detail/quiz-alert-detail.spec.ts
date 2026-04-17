import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter, ActivatedRoute} from '@angular/router';
import {QuizAlertDetail} from './quiz-alert-detail';
import {QuizAlertService} from '../../../../services/quiz-alert/quiz-alert';
import {UserService} from '../../../../services/user/user';

describe('QuizAlertDetail', () => {
  let fixture: ComponentFixture<QuizAlertDetail>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizAlertDetail],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => '1'}}}},
        {provide: QuizAlertService, useValue: {retrieve: () => of(null)}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizAlertDetail);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
