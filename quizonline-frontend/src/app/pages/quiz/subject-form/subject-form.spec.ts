import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {QuizSubjectForm} from './subject-form';
import {SubjectService} from '../../../services/subject/subject';
import {UserService} from '../../../services/user/user';

describe('QuizSubjectForm', () => {
  let component: QuizSubjectForm;
  let fixture: ComponentFixture<QuizSubjectForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizSubjectForm],
      providers: [
        {
          provide: SubjectService,
          useValue: {
            list: () => of([]),
          },
        },
        {
          provide: UserService,
          useValue: {
            currentLang: 'fr',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizSubjectForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
