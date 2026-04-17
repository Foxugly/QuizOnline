import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {QuestionView} from './question-view';
import {QuestionService} from '../../../services/question/question';
import {UserService} from '../../../services/user/user';

describe('View', () => {
  let component: QuestionView;
  let fixture: ComponentFixture<QuestionView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionView],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({questionId: '1'}),
            },
          },
        },
        {
          provide: QuestionService,
          useValue: {
            retrieve: () => of({
              id: 1,
              domain: {
                id: 1,
                translations: {},
                allowed_languages: [],
                active: true,
                owner: {id: 1, username: 'owner'},
                managers: [],
                members: [],
                created_at: '',
                updated_at: '',
              },
              translations: {},
              allow_multiple_correct: false,
              active: true,
              is_mode_practice: true,
              is_mode_exam: true,
              subjects: [],
              answer_options: [],
              media: [],
              created_at: '',
            }),
            goBack: jasmine.createSpy('goBack'),
            goEdit: jasmine.createSpy('goEdit'),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentLang: 'fr',
            isAdmin: () => false,
            lang$: of('fr'),
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(QuestionView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
