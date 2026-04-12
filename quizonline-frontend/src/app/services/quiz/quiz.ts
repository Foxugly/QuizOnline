import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {map, Observable, of, switchMap} from 'rxjs';
import {
  CreateQuizInputRequest,
  GenerateFromSubjectsInputRequest,
  PaginatedQuizAssignmentListList,
  QuestionService as QuestionApiService,
  QuizAnswerService,
  QuizAssignmentList,
  QuizService as QuizApiService,
  Quiz,
  QuizList,
  QuizQuestionAnswer,
  QuizQuestionAnswerWriteRequest,
  QuizTemplateService as QuizTemplateApiService,
  QuizTemplate,
} from '../../api/generated';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export interface QuizSubjectCreatePayload {
  title: string;
  domain_id: number;
  subject_ids: number[];
  max_questions: number;
  with_duration: boolean;
  duration: number | null;
}

export type QuizTemplateAssignmentSessionDto = QuizAssignmentList;

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  constructor(
    private quizApi: QuizApiService,
    private qtApi: QuizTemplateApiService,
    private questionApi: QuestionApiService,
    private answerApi: QuizAnswerService,
    private http: HttpClient,
    private router: Router,
  ) {}

  goList(): void {
    this.router.navigate(['/quiz', 'list']);
  }

  startQuiz(id: number): Observable<Quiz> {
    return this.quizApi.quizStartCreate(id);
  }

  createQuizFromTemplate(quizTemplateId: number): Observable<Quiz> {
    return this.quizApi.quizCreate({quiz_template_id: quizTemplateId});
  }

  closeQuiz(id: number): Observable<Quiz> {
    return this.quizApi.quizCloseCreate(id);
  }

  goStart(id: number, onError?: (err: unknown) => void): void {
    this.startQuiz(id).subscribe({
      next: (session: Quiz): void => {
        this.goQuestion(session.id);
      },
      error: (err: unknown): void => {
        if (onError) {
          onError(err);
        } else {
          console.error('Erreur startQuizSession', err);
        }
      },
    });
  }

  goView(id: number): void {
    this.router.navigate(['/quiz', id]);
  }

  goCompose(): void {
    this.router.navigate(['/quiz', 'add']);
  }

  goQuestion(id: number): void {
    this.router.navigate(['/quiz', id, 'questions']);
  }

  getQuestionCountBySubjects(subjectIds: number[]): Observable<{ count: number }> {
    if (!subjectIds.length) {
      return of({count: 0});
    }

    return this.questionApi.questionList(
      true,        // active
      undefined,   // domain
      undefined,   // isModeExam
      true,        // isModePractice
      undefined,   // page
      1,           // pageSize
      undefined,   // search
      subjectIds,
    ).pipe(
      map((response) => ({count: response.count})),
    );
  }

  generateQuiz(payload: GenerateFromSubjectsInputRequest): Observable<Quiz> {
    return this.qtApi.quizTemplateGenerateFromSubjectsCreate(payload).pipe(
      switchMap((quizTemplate) => this.createQuizFromTemplate(quizTemplate.id)),
    );
  }

  listQuiz(params?: {name?: string; search?: string}): Observable<QuizList[]> {
    return this.quizApi.quizList(params?.name, undefined, params?.search).pipe(
      map((response) => response.results ?? []),
    );
  }

  listTemplates(): Observable<QuizTemplate[]> {
    return this.qtApi.quizTemplateList().pipe(map((response) => response.results ?? []));
  }

  assignTemplateToUsers(quizTemplateId: number, userIds: number[]): Observable<QuizList[]> {
    return this.http.post<QuizList[]>(`${this.apiBaseUrl}/quiz/bulk-create-from-template/`, {
      quiz_template_id: quizTemplateId,
      user_ids: userIds,
    });
  }

  listTemplateSessions(quizTemplateId: number): Observable<QuizAssignmentList[]> {
    return this.qtApi.quizTemplateSessionsList(quizTemplateId).pipe(
      map((response: QuizAssignmentList[] | PaginatedQuizAssignmentListList) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results ?? [];
      }),
    );
  }

  deleteQuiz(id: number): Observable<void> {
    return this.quizApi.quizDestroy(id).pipe(
      map(() => void 0),
    );
  }

  retrieveQuiz(id: number): Observable<Quiz> {
    return this.quizApi.quizRetrieve(id);
  }

  saveAnswer(
    quizId: number,
    payload: QuizQuestionAnswerWriteRequest,
  ): Observable<QuizQuestionAnswer> {
    if (payload.question_order == null) {
      throw new Error('question_order is required');
    }

    return this.answerApi.quizAnswerCreate(quizId, payload);
  }

  listAnswers(quizId: number): Observable<QuizQuestionAnswer[]> {
    return this.answerApi.quizAnswerList(quizId).pipe(map((response) => response.results ?? []));
  }

  goSubject(): void {
    this.router.navigate(['/quiz/quick']);
  }
}
