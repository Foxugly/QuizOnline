import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';

import {QuizQuestionComponent} from './quiz-question';
import {UserService} from '../../services/user/user';
import {JoinPolicyEnumDto} from '../../api/generated/model/join-policy-enum';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';

describe('QuizQuestionDto', () => {
  let component: QuizQuestionComponent;
  let fixture: ComponentFixture<QuizQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQuestionComponent],
      providers: [
        {
          provide: UserService,
          useValue: {
            currentLang: LanguageEnumDto.Fr,
            lang: signal(LanguageEnumDto.Fr).asReadonly(),
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(QuizQuestionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('quizNavItem', {
      index: 1,
      id: 1,
      answered: false,
      flagged: false,
      question: {
        id: 100,
        domain: {
          id: 1,
          translations: {},
          allowed_languages: [],
          active: true,
          subjects_count: 0,
          questions_count: 0,
          owner: {id: 1, name: 'owner'},
          managers: [],
          members: [],
          created_at: '',
          updated_at: '',
          join_policy: JoinPolicyEnumDto.Auto,
          pending_join_requests_count: null,
          my_join_request_status: null,
        },
        translations: {
          [LanguageEnumDto.Fr]: {
            title: 'Question',
          },
        },
        allow_multiple_correct: false,
        active: true,
        is_mode_practice: true,
        is_mode_exam: true,
        subjects: [],
        answer_options: [],
        prompt_blocks: [],
        explanation_blocks: [],
        available_lang_codes: [],
        created_at: '',
      },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function setQuestion(allowMultiple: boolean, correctFlags: (boolean | null | undefined)[]): void {
    fixture.componentRef.setInput('quizNavItem', {
      index: 1,
      id: 1,
      answered: false,
      flagged: false,
      question: {
        id: 100,
        domain: {
          id: 1,
          translations: {},
          allowed_languages: [],
          active: true,
          subjects_count: 0,
          questions_count: 0,
          owner: {id: 1, name: 'owner'},
          managers: [],
          members: [],
          created_at: '',
          updated_at: '',
          join_policy: JoinPolicyEnumDto.Auto,
          pending_join_requests_count: null,
          my_join_request_status: null,
        },
        translations: {[LanguageEnumDto.Fr]: {title: 'Q'}},
        allow_multiple_correct: allowMultiple,
        active: true,
        is_mode_practice: true,
        is_mode_exam: true,
        subjects: [],
        answer_options: correctFlags.map((is_correct, i) => ({
          id: i + 1,
          is_correct,
          sort_order: i + 1,
          translations: {[LanguageEnumDto.Fr]: {content: `opt ${i + 1}`}},
          blocks: [],
        })),
        prompt_blocks: [],
        explanation_blocks: [],
        available_lang_codes: [],
        created_at: '',
      },
    });
    fixture.detectChanges();
  }

  describe('allowMultiple widget choice', () => {
    it('returns true when allow_multiple_correct flag is set', () => {
      setQuestion(true, [true]);
      expect(component.allowMultiple).toBe(true);
    });

    it('returns true when flag is false but 2+ options are flagged correct (defensive fallback)', () => {
      setQuestion(false, [true, true, false]);
      expect(component.allowMultiple).toBe(true);
    });

    it('returns false when flag is false and exactly one option is correct', () => {
      setQuestion(false, [true, false, false]);
      expect(component.allowMultiple).toBe(false);
    });

    it('returns false when correctness is hidden (is_correct undefined for the learner)', () => {
      setQuestion(false, [undefined, undefined, undefined]);
      expect(component.allowMultiple).toBe(false);
    });
  });
});
