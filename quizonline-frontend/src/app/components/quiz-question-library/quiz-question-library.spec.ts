import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {QuizQuestionLibraryComponent} from './quiz-question-library';
import {UserService} from '../../services/user/user';

describe('QuizQuestionLibraryComponent', () => {
  let fixture: ComponentFixture<QuizQuestionLibraryComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQuestionLibraryComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuizQuestionLibraryComponent);
    fixture.componentRef.setInput('texts', {
      questionSearchPlaceholder: '', questionSubjectFilter: '', questionSubjectFilterPlaceholder: '',
      createQuestion: '', selectDomainToLoadQuestions: '', loadingQuestions: '', noAvailableQuestions: '',
      compositionTitle: '', compositionHelp: '', compositionEmpty: '', weight: '', weightHelp: '',
      settingsTab: '', questionsTab: '', settingsTitle: '', questionPoolTitle: '',
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
