import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {DomainEdit} from './domain-edit';
import {DomainService} from '../../../services/domain/domain';
import {LanguageService} from '../../../services/language/language';
import {TranslationService} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';

describe('DomainEdit', () => {
  let component: DomainEdit;
  let fixture: ComponentFixture<DomainEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainEdit],
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
          provide: DomainService,
          useValue: {
            detail: () => of({
              id: 1,
              translations: {},
              allowed_languages: [],
              active: true,
              owner: {id: 1, username: 'owner'},
              managers: [],
              created_at: '',
              updated_at: '',
              subjects: [],
            }),
            update: () => of({}),
          },
        },
        {
          provide: UserService,
          useValue: {
            list: () => of([]),
            currentUser: () => ({id: 1}),
            currentLang: 'fr',
          },
        },
        {
          provide: LanguageService,
          useValue: {
            list: () => of([]),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translateBatch: () => Promise.resolve({}),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DomainEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
