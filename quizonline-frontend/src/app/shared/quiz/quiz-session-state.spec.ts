import {JoinPolicyEnumDto} from '../../api/generated/model/join-policy-enum';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {QuizQuestionAnswerDto} from '../../api/generated/model/quiz-question-answer';
import {QuizQuestionReadDto} from '../../api/generated/model/quiz-question-read';
import {
  applyQuizAnswers,
  buildQuizNavItems,
  findQuizNavItem,
  updateQuizNavItem,
} from './quiz-session-state';

describe('quiz session state helpers', () => {
  const domain = {
    id: 1,
    translations: {
      [LanguageEnumDto.Fr]: {
        name: 'Domaine',
        description: '',
      },
    },
    allowed_languages: [],
    active: true,
    public: true,
    subjects_count: 0,
    questions_count: 0,
    owner: {
      id: 1,
      username: 'owner',
    },
    managers: [],
    members: [],
    created_at: '2026-03-30T12:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
    join_policy: JoinPolicyEnumDto.Auto,
    pending_join_requests_count: null,
    my_join_request_status: null,
    notification_settings: {},
    certificate_logo: null,
    certificate_signatory_name: '',
  };

  const questions: QuizQuestionReadDto[] = [
    {
      id: 10,
      sort_order: 1,
      weight: 1,
      question: {
        id: 100,
        domain,
        allow_multiple_correct: false,
        active: true,
        is_mode_practice: true,
        is_mode_exam: true,
        created_at: '2026-03-30T12:00:00Z',
        translations: {
          [LanguageEnumDto.Fr]: {
            title: 'Q1',
          },
        },
        subjects: [],
        answer_options: [],
        prompt_blocks: [],
        explanation_blocks: [],
        available_lang_codes: [],
      },
    },
    {
      id: 11,
      sort_order: 2,
      weight: 1,
      question: {
        id: 101,
        domain,
        allow_multiple_correct: false,
        active: true,
        is_mode_practice: true,
        is_mode_exam: true,
        created_at: '2026-03-30T12:00:00Z',
        translations: {
          [LanguageEnumDto.Fr]: {
            title: 'Q2',
          },
        },
        subjects: [],
        answer_options: [],
        prompt_blocks: [],
        explanation_blocks: [],
        available_lang_codes: [],
      },
    },
  ];

  it('builds nav items from ordered quiz questions', () => {
    const items = buildQuizNavItems(questions);

    expect(items.length).toBe(2);
    expect(items[0].index).toBe(1);
    expect(items[0].id).toBe(100);
    expect(items[1].index).toBe(2);
    expect(items[1].id).toBe(101);
  });

  it('applies persisted answers by question order', () => {
    const items = buildQuizNavItems(questions);
    const answers: QuizQuestionAnswerDto[] = [
      {
        id: 201,
        quiz: 700,
        quizquestion_id: 10,
        question_order: 1,
        question_id: 100,
        selected_options: [501],
        answered_at: '2026-03-30T12:05:00Z',
      },
    ];

    const hydrated = applyQuizAnswers(items, answers);

    expect(hydrated[0].answered).toBeTrue();
    expect(hydrated[0].selectedOptionIds).toEqual([501]);
    expect(hydrated[1].answered).toBeFalse();
  });

  it('leaves items untouched when no answer matches their session position', () => {
    const items = buildQuizNavItems(questions);
    const answers: QuizQuestionAnswerDto[] = [
      {
        id: 203,
        quiz: 700,
        quizquestion_id: 99,
        question_order: 99,
        question_id: 999,
        selected_options: [777],
        answered_at: '2026-03-30T12:06:00Z',
      },
    ];

    const hydrated = applyQuizAnswers(items, answers);

    expect(hydrated[0].answered).toBeFalse();
    expect(hydrated[1].answered).toBeFalse();
  });

  it('updates and retrieves a single nav item', () => {
    const items = updateQuizNavItem(buildQuizNavItems(questions), 2, {
      answered: true,
      selectedOptionIds: [777],
    });

    expect(findQuizNavItem(items, 2)?.answered).toBeTrue();
    expect(findQuizNavItem(items, 2)?.selectedOptionIds).toEqual([777]);
    expect(findQuizNavItem(items, 99)).toBeNull();
  });
});
