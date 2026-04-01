import {Page, Request, Route} from '@playwright/test';

type JsonObject = Record<string, unknown>;

type MockApiOptions = {
  me?: JsonObject;
  domains?: JsonObject[];
  domainDetails?: Record<string, JsonObject>;
  subjects?: JsonObject[];
  questions?: JsonObject[];
  questionDetails?: Record<string, JsonObject>;
  quizzes?: JsonObject[];
  quizDetails?: Record<string, JsonObject>;
  answersByOrder?: Record<string, JsonObject>;
};

export type MockApiState = {
  requests: {
    login: JsonObject[];
    passwordReset: JsonObject[];
    passwordResetConfirm: JsonObject[];
    mediaCreate: JsonObject[];
    questionCreate: JsonObject[];
    quizTemplateCreate: JsonObject[];
    quizTemplateQuestionCreate: JsonObject[];
    quizCreate: JsonObject[];
    quizAnswerCreate: JsonObject[];
    quizAnswerUpdate: JsonObject[];
  };
};

const defaultMe = {
  id: 1,
  username: 'admin',
  email: 'admin@example.test',
  language: 'fr',
  is_staff: true,
  is_superuser: false,
};

const defaultDomain = {
  id: 1,
  active: true,
  translations: {
    fr: {name: 'Sciences', description: '<p>Domaine sciences</p>'},
  },
  allowed_languages: [{code: 'fr', active: true}],
};

const defaultSubject = {
  id: 10,
  active: true,
  domain: 1,
  translations: {
    fr: {
      name: 'Physique',
      description: '<p>Sujet physique</p>',
      domain: {id: 1, name: 'Sciences'},
    },
  },
};

const defaultQuestion = {
  id: 200,
  active: true,
  allow_multiple_correct: false,
  is_mode_practice: true,
  is_mode_exam: false,
  domain: {
    id: 1,
    translations: {
      fr: {name: 'Sciences', description: '<p>Domaine sciences</p>'},
    },
  },
  subjects: [
    {
      id: 10,
      domain: 1,
      translations: {
        fr: {
          name: 'Physique',
          description: '<p>Sujet physique</p>',
          domain: {id: 1, name: 'Sciences'},
        },
      },
    },
  ],
  translations: {
    fr: {
      title: 'Question de test',
      description: '<p>Description de test</p>',
      explanation: '<p>Explication de test</p>',
    },
  },
  media: [
    {
      id: 300,
      sort_order: 1,
      asset: {
        id: 400,
        kind: 'image',
        file: 'https://cdn.example.test/image.png',
        external_url: null,
      },
    },
    {
      id: 301,
      sort_order: 2,
      asset: {
        id: 401,
        kind: 'video',
        file: 'https://cdn.example.test/video.mp4',
        external_url: null,
      },
    },
    {
      id: 302,
      sort_order: 3,
      asset: {
        id: 402,
        kind: 'external',
        file: null,
        external_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    },
  ],
  answer_options: [
    {
      id: 501,
      sort_order: 1,
      content: '<p>Bonne reponse</p>',
      is_correct: true,
    },
    {
      id: 502,
      sort_order: 2,
      content: '<p>Mauvaise reponse</p>',
      is_correct: false,
    },
  ],
};

const defaultQuiz = {
  id: 700,
  title: 'Quiz de test',
  quiz_template_title: 'Quiz de test',
  user: 'admin',
  mode: 'practice',
  max_questions: 2,
  with_duration: true,
  duration: 10,
  is_closed: false,
  created_at: '2026-03-30T12:00:00Z',
  started_at: '2026-03-30T12:01:00Z',
  expired_at: '2026-03-30T12:11:00Z',
  ended_at: '2026-03-30T12:11:00Z',
  questions: [
    {
      id: 801,
      sort_order: 1,
      question: {
        ...defaultQuestion,
        id: 200,
      },
    },
    {
      id: 802,
      sort_order: 2,
      question: {
        ...defaultQuestion,
        id: 201,
        translations: {
          fr: {
            title: 'Deuxieme question',
            description: '<p>Description 2</p>',
            explanation: '<p>Explication 2</p>',
          },
        },
      },
    },
  ],
};

function withCorsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': '*',
    'content-type': 'application/json',
    ...extra,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    headers: withCorsHeaders(),
    body: JSON.stringify(body),
  });
}

function parseBody(request: Request): JsonObject {
  const contentType = request.headers()['content-type'] ?? '';
  try {
    return request.postDataJSON() as JsonObject;
  } catch {
    const raw = request.postData() ?? '';
    if (!raw) {
      return {};
    }

    if (!contentType.includes('multipart/form-data')) {
      const params = new URLSearchParams(raw);
      if ([...params.keys()].length > 0) {
        return Object.fromEntries(params.entries());
      }
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(raw);
      return Object.fromEntries(params.entries());
    }

    const multipart: JsonObject = {};
    const fieldPattern = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n/g;
    for (const match of raw.matchAll(fieldPattern)) {
      multipart[match[1]] = match[2];
    }
    return multipart;
  }
}

function buildQuestionCreateResponse(body: JsonObject): JsonObject {
  return {
    id: 999,
    active: body.active ?? true,
    allow_multiple_correct: body.allow_multiple_correct ?? false,
    is_mode_practice: body.is_mode_practice ?? true,
    is_mode_exam: body.is_mode_exam ?? false,
    translations: body.translations ?? {},
    subjects: [],
    answer_options: [],
    media: [],
    domain: defaultQuestion.domain,
  };
}

export async function seedAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-access');
    localStorage.setItem('refresh_token', 'test-refresh');
    localStorage.setItem('remember_me', '1');
    localStorage.setItem('username', 'admin');
    localStorage.setItem('lang', 'fr');
  });
}

export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<MockApiState> {
  const state: MockApiState = {
    requests: {
      login: [],
      passwordReset: [],
      passwordResetConfirm: [],
      mediaCreate: [],
      questionCreate: [],
      quizTemplateCreate: [],
      quizTemplateQuestionCreate: [],
      quizCreate: [],
      quizAnswerCreate: [],
      quizAnswerUpdate: [],
    },
  };

  const domains = options.domains ?? [defaultDomain];
  const subjects = options.subjects ?? [defaultSubject];
  const questions = options.questions ?? [defaultQuestion];
  const quizzes = options.quizzes ?? [defaultQuiz];

  const questionDetails: Record<string, JsonObject> = {
    '200': defaultQuestion,
    '201': {
      ...defaultQuestion,
      id: 201,
      translations: {
        fr: {
          title: 'Deuxieme question',
          description: '<p>Description 2</p>',
          explanation: '<p>Explication 2</p>',
        },
      },
    },
    ...(options.questionDetails ?? {}),
  };

  const quizDetails: Record<string, JsonObject> = {
    '700': defaultQuiz,
    ...(options.quizDetails ?? {}),
  };

  const domainDetails: Record<string, JsonObject> = {
    '1': defaultDomain,
    ...(options.domainDetails ?? {}),
  };

  const answersByOrder = options.answersByOrder ?? {};
  let createdQuizTemplate: JsonObject | null = null;
  let createdQuiz: JsonObject | null = null;

  await page.route('http://127.0.0.1:8000/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: withCorsHeaders(),
      });
      return;
    }

    if (path === '/api/token/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.login.push(body);
      await fulfillJson(route, {access: 'test-access', refresh: 'test-refresh'}, 200);
      return;
    }

    if (path === '/api/user/me/' && request.method() === 'GET') {
      await fulfillJson(route, options.me ?? defaultMe, 200);
      return;
    }

    if (path === '/api/user/password/reset/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.passwordReset.push(body);
      await fulfillJson(route, {detail: 'ok'}, 200);
      return;
    }

    if (path === '/api/user/password/reset/confirm/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.passwordResetConfirm.push(body);
      await fulfillJson(route, {detail: 'ok'}, 200);
      return;
    }

    if (path === '/api/domain/' && request.method() === 'GET') {
      await fulfillJson(route, domains, 200);
      return;
    }

    if (path.match(/^\/api\/domain\/\d+\/$/) && request.method() === 'GET') {
      const id = path.split('/').filter(Boolean).at(-1) ?? '';
      await fulfillJson(route, domainDetails[id] ?? defaultDomain, 200);
      return;
    }

    if (path === '/api/subject/' && request.method() === 'GET') {
      await fulfillJson(route, subjects, 200);
      return;
    }

    if (path === '/api/question/' && request.method() === 'GET') {
      await fulfillJson(route, questions, 200);
      return;
    }

    if (path === '/api/question/media/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.mediaCreate.push(body);
      await fulfillJson(route, {
        id: 850,
        kind: body.kind ?? 'external',
        file: null,
        external_url: body.externalUrl ?? null,
        sha256: null,
        created_at: '2026-03-30T12:00:00Z',
      }, 201);
      return;
    }

    if (path === '/api/question/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.questionCreate.push(body);
      await fulfillJson(route, buildQuestionCreateResponse(body), 201);
      return;
    }

    if (path.match(/^\/api\/question\/\d+\/$/) && request.method() === 'GET') {
      const id = path.split('/').filter(Boolean).at(-1) ?? '';
      await fulfillJson(route, questionDetails[id] ?? defaultQuestion, 200);
      return;
    }

    if (path === '/api/quiz/' && request.method() === 'GET') {
      const payload = createdQuiz ? [createdQuiz, ...quizzes] : quizzes;
      await fulfillJson(route, payload, 200);
      return;
    }

    if (path === '/api/quiz/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.quizCreate.push(body);
      createdQuiz = {
        id: 701,
        quiz_template: 950,
        quiz_template_title: createdQuizTemplate?.['title'] ?? 'Quiz compose',
        quiz_template_description: createdQuizTemplate?.['description'] ?? '',
        user: 1,
        user_summary: {id: 1, username: 'admin'},
        mode: createdQuizTemplate?.['mode'] ?? 'practice',
        created_at: '2026-03-30T12:05:00Z',
        started_at: null,
        ended_at: null,
        active: false,
        can_answer: false,
        max_questions: createdQuizTemplate?.['max_questions'] ?? 2,
        with_duration: createdQuizTemplate?.['with_duration'] ?? false,
        duration: createdQuizTemplate?.['duration'] ?? 10,
        questions: [],
        answers: [],
        total_answers: null,
        correct_answers: null,
        earned_score: null,
        max_score: null,
      };
      await fulfillJson(route, createdQuiz, 201);
      return;
    }

    if (path.match(/^\/api\/quiz\/\d+\/$/) && request.method() === 'GET') {
      const id = path.split('/').filter(Boolean).at(-1) ?? '';
      await fulfillJson(route, quizDetails[id] ?? (id === '701' && createdQuiz ? createdQuiz : defaultQuiz), 200);
      return;
    }

    if (path === '/api/quiz/template/' && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.quizTemplateCreate.push(body);
      createdQuizTemplate = {
        id: 950,
        slug: 'quiz-compose',
        created_at: '2026-03-30T12:04:00Z',
        questions_count: 0,
        can_answer: true,
        quiz_questions: [],
        ...body,
      };
      await fulfillJson(route, createdQuizTemplate, 201);
      return;
    }

    if (path.match(/^\/api\/quiz\/template\/\d+\/question\/$/) && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.quizTemplateQuestionCreate.push(body);
      await fulfillJson(route, {
        id: 980 + state.requests.quizTemplateQuestionCreate.length,
        question: defaultQuestion,
        sort_order: body.sort_order ?? state.requests.quizTemplateQuestionCreate.length,
        weight: body.weight ?? 1,
      }, 201);
      return;
    }

    if (path.match(/^\/api\/quiz\/\d+\/answer\/$/) && request.method() === 'GET') {
      await fulfillJson(route, Object.values(answersByOrder), 200);
      return;
    }

    if (path.match(/^\/api\/quiz\/\d+\/answer\/\d+\/$/) && request.method() === 'GET') {
      const segments = path.split('/').filter(Boolean);
      const answerId = segments.at(-1) ?? '';
      const answer = answersByOrder[answerId];
      if (answer) {
        await fulfillJson(route, answer, 200);
      } else {
        await fulfillJson(route, {detail: 'Not found'}, 404);
      }
      return;
    }

    if (path.match(/^\/api\/quiz\/\d+\/answer\/$/) && request.method() === 'POST') {
      const body = parseBody(request);
      state.requests.quizAnswerCreate.push(body);
      await fulfillJson(route, body, 201);
      return;
    }

    if (path.match(/^\/api\/quiz\/\d+\/answer\/\d+\/$/) && request.method() === 'PUT') {
      const body = parseBody(request);
      state.requests.quizAnswerUpdate.push(body);
      await fulfillJson(route, body, 200);
      return;
    }

    await fulfillJson(route, {detail: `Unhandled mock for ${request.method()} ${path}`}, 501);
  });

  return state;
}
