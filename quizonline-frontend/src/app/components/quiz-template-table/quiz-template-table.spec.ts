import {ComponentFixture, TestBed} from '@angular/core/testing';
import {QuizTemplateTableComponent} from './quiz-template-table';

describe('QuizTemplateTableComponent', () => {
  let fixture: ComponentFixture<QuizTemplateTableComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateTableComponent);
    fixture.componentRef.setInput('uiText', {
      templates: {empty: '', modeExam: '', modePractice: '', yes: '', no: '', permanent: ''},
      sessions: {empty: ''},
      toolbar: {search: '', compose: '', quick: ''},
      assignDialog: {
        title: '', search: '', roleAll: '', roleOwner: '', roleManager: '', roleMember: '',
        assign: '', cancel: '', noUsers: '', selected: '',
      },
    });
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
