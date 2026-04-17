import {ComponentFixture, TestBed} from '@angular/core/testing';
import {QuizTemplateAssignDialogComponent} from './quiz-template-assign-dialog';

describe('QuizTemplateAssignDialogComponent', () => {
  let fixture: ComponentFixture<QuizTemplateAssignDialogComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateAssignDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateAssignDialogComponent);
    fixture.componentRef.setInput('texts', {
      assignDialog: {
        title: '', search: '', roleAll: '', roleOwner: '', roleManager: '', roleMember: '',
        assign: '', cancel: '', noUsers: '', selected: '',
      },
      templates: {empty: '', modeExam: '', modePractice: '', yes: '', no: '', permanent: ''},
      sessions: {empty: ''},
      toolbar: {search: '', compose: '', quick: ''},
    });
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
