import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {DomainDelete} from './domain-delete';
import {DomainService} from '../../../services/domain/domain';
import {UserService} from '../../../services/user/user';

describe('DomainDelete', () => {
  let component: DomainDelete;
  let fixture: ComponentFixture<DomainDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainDelete],
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
            retrieve: () => of({
              id: 1,
              translations: {},
              allowed_languages: [],
              active: true,
              owner: {id: 1, username: 'owner'},
              staff: [],
              created_at: '',
              updated_at: '',
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

    fixture = TestBed.createComponent(DomainDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
