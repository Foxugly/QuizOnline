import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {QuestionDelete} from './question-delete';
import {QuestionService} from '../../../services/question/question';
import {UserService} from '../../../services/user/user';

describe('QuestionDelete', () => {
  let component: QuestionDelete;
  let fixture: ComponentFixture<QuestionDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionDelete],
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
                staff: [],
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
            delete: () => of({}),
            goBack: jasmine.createSpy('goBack'),
            goList: jasmine.createSpy('goList'),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentLang: 'fr',
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(QuestionDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
