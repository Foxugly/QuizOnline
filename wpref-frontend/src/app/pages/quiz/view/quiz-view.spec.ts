import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {QuizView} from './quiz-view';
import {QuizService} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';

describe('View', () => {
  let component: QuizView;
  let fixture: ComponentFixture<QuizView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizView],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({id: '1'}),
            },
          },
        },
        {
          provide: QuizService,
          useValue: {
            retrieveQuiz: () => of({
              id: 1,
              quiz_template: 1,
              quiz_template_title: 'Quiz',
              quiz_template_description: '',
              user: 1,
              user_summary: {id: 1, username: 'user'},
              mode: 'exam',
              created_at: '',
              started_at: '',
              ended_at: null,
              active: true,
              can_answer: true,
              max_questions: 1,
              with_duration: false,
              duration: 0,
              questions: [],
              answers: [],
              total_answers: 0,
              correct_answers: 0,
              earned_score: 0,
              max_score: 0,
              answer_correctness_state: 'unknown',
            }),
            goList: jasmine.createSpy('goList'),
            goStart: jasmine.createSpy('goStart'),
            goQuestion: jasmine.createSpy('goQuestion'),
          },
        },
        {
          provide: UserService,
          useValue: {
            isAdmin: () => false,
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(QuizView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
