import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {SubjectEdit} from './subject-edit';
import {SubjectService} from '../../../services/subject/subject';
import {DomainService} from '../../../services/domain/domain';
import {UserService} from '../../../services/user/user';
import {TranslationService} from '../../../services/translation/translation';
import {QuestionService} from '../../../services/question/question';

describe('SubjectEdit', () => {
  let component: SubjectEdit;
  let fixture: ComponentFixture<SubjectEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectEdit],
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
          provide: SubjectService,
          useValue: {
            detail: () => of({
              id: 1,
              active: true,
              domain: 1,
              translations: {},
              questions: [],
            }),
            update: () => of({}),
            goBack: jasmine.createSpy('goBack'),
          },
        },
        {
          provide: DomainService,
          useValue: {
            retrieve: () => of({
              id: 1,
              translations: {},
              allowed_languages: [],
              active: true,
              owner: {id: 1, username: 'owner'},
              staff: [],
              members: [],
              created_at: '',
              updated_at: '',
            }),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentLang: 'fr',
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translateBatch: () => Promise.resolve({}),
          },
        },
        {
          provide: QuestionService,
          useValue: {},
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(SubjectEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
