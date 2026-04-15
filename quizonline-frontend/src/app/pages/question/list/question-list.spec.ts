import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {DomainService} from '../../../services/domain/domain';
import {QuestionService} from '../../../services/question/question';
import {SubjectService} from '../../../services/subject/subject';
import {UserService} from '../../../services/user/user';
import {QuestionList} from './question-list';

describe('QuestionList', () => {
  let component: QuestionList;
  let fixture: ComponentFixture<QuestionList>;
  let questionService: jasmine.SpyObj<QuestionService>;

  beforeEach(async () => {
    questionService = jasmine.createSpyObj<QuestionService>('QuestionService', [
      'listPage',
      'list',
      'goNew',
      'goImport',
      'goEdit',
      'goDelete',
      'goSubjectEdit',
      'exportStructured',
    ]);
    questionService.listPage.and.returnValue(of({count: 25, next: null, previous: null, results: []}));
    questionService.list.and.returnValue(of([]));
    questionService.exportStructured.and.returnValue(of({blob: new Blob(), filename: 'questions.json'}));

    await TestBed.configureTestingModule({
      imports: [QuestionList],
      providers: [
        provideNoopAnimations(),
        {provide: QuestionService, useValue: questionService},
        {
          provide: SubjectService,
          useValue: {
            list: () => of([]),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentLang: LanguageEnumDto.Fr,
            currentUser: () => ({current_domain: 1}),
          },
        },
        {
          provide: DomainService,
          useValue: {
            goEdit: jasmine.createSpy('goEdit'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the first page on init', () => {
    expect(questionService.listPage).toHaveBeenCalledOnceWith({
      search: undefined,
      subjectIds: [],
      domainId: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('loads the requested page from lazy table events', () => {
    component.onLazyLoad({first: 10, rows: 10});

    expect(component.first()).toBe(10);
    expect(component.rows()).toBe(10);
    expect(questionService.listPage).toHaveBeenCalledWith({
      search: undefined,
      subjectIds: [],
      domainId: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
