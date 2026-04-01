import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {SubjectDelete} from './subject-delete';
import {SubjectService} from '../../../services/subject/subject';
import {UserService} from '../../../services/user/user';

describe('SubjectDelete', () => {
  let component: SubjectDelete;
  let fixture: ComponentFixture<SubjectDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectDelete],
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
            retrieve: () => of({
              id: 1,
              domain: 1,
              active: true,
              translations: {},
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

    fixture = TestBed.createComponent(SubjectDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
