import {ComponentFixture, TestBed} from '@angular/core/testing';
import {QuizTemplateCompositionComponent} from './quiz-template-composition';

describe('QuizTemplateCompositionComponent', () => {
  let fixture: ComponentFixture<QuizTemplateCompositionComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTemplateCompositionComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizTemplateCompositionComponent);
    fixture.componentRef.setInput('texts', {
      compositionTitle: '', compositionHelp: '', compositionEmpty: '', weight: '', weightHelp: '',
      settingsTab: '', questionsTab: '', settingsTitle: '', questionPoolTitle: '',
      questionSearchPlaceholder: '', questionSubjectFilter: '', questionSubjectFilterPlaceholder: '',
      createQuestion: '', selectDomainToLoadQuestions: '', loadingQuestions: '', noAvailableQuestions: '',
      createTitle: '', editTitle: '', createSubtitle: '', editSubtitle: '',
      createTemplate: '', saveTemplate: '', domain: '', mode: '', timer: '', duration: '',
      active: '', public: '', permanent: '', startedAt: '', endedAt: '',
      detailVisibility: '', detailAvailableAt: '', quizTitle: '', quizDescription: '',
      translationsTitle: '', languagesCount: '', translateOthers: '', translating: '',
      translationHint: '', translationRequired: '', practiceMode: '', examMode: '',
      visibilityImmediate: '', visibilityScheduled: '', visibilityNever: '',
      dateFormat: '', today: '', clear: '', weekHeader: '',
      dayNames: [], dayNamesShort: [], dayNamesMin: [], monthNames: [], monthNamesShort: [],
    });
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
