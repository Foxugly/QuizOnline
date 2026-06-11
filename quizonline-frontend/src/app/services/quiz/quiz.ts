import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {EMPTY, expand, finalize, map, Observable, of, reduce, shareReplay, switchMap} from 'rxjs';
import {QuestionApi as QuestionApiService} from '../../api/generated/api/question.service';
import {QuizAnswerApi as QuizAnswerApiService} from '../../api/generated/api/quiz-answer.service';
import {QuizApi as QuizApiService} from '../../api/generated/api/quiz.service';
import {QuizTemplateApi as QuizTemplateApiService} from '../../api/generated/api/quiz-template.service';
import {CreateQuizInputRequestDto} from '../../api/generated/model/create-quiz-input-request';
import {GenerateFromSubjectsInputRequestDto} from '../../api/generated/model/generate-from-subjects-input-request';
import {PaginatedQuizAssignmentListListDto} from '../../api/generated/model/paginated-quiz-assignment-list-list';
import {QuizAssignmentListDto} from '../../api/generated/model/quiz-assignment-list';
import {QuizDto} from '../../api/generated/model/quiz';
import {QuizListDto} from '../../api/generated/model/quiz-list';
import {QuizQuestionAnswerDto} from '../../api/generated/model/quiz-question-answer';
import {QuizQuestionAnswerWriteRequestDto} from '../../api/generated/model/quiz-question-answer-write-request';
import {QuizTemplateDto} from '../../api/generated/model/quiz-template';
import {QuizTemplateListDto} from '../../api/generated/model/quiz-template-list';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export interface QuizSubjectCreatePayload {
  title: string;
  domain_id: number;
  subject_ids: number[];
  max_questions: number;
  with_duration: boolean;
  duration: number | null;
}

export type QuizTemplateAssignmentSessionDto = QuizAssignmentListDto;

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

    private readonly quizApi = inject(QuizApiService);
  private readonly qtApi = inject(QuizTemplateApiService);
  private readonly questionApi = inject(QuestionApiService);
  private readonly answerApi = inject(QuizAnswerApiService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** In-flight share of the unfiltered ``listQuiz()`` (all pages). A lesson
   *  with several quiz blocks mounts that many ``QuizBlockRenderer``s, each
   *  calling ``listQuiz()`` with no params on init — without this they each
   *  fan out an identical multi-page walk of ``GET /api/quiz/``. Sharing the
   *  in-flight observable collapses them into one; the slot clears on
   *  completion so a later mount (post-session-start) refetches fresh. */
  private listQuizAll$: Observable<QuizListDto[]> | null = null;

  goList(): void {
    this.router.navigate(['/quiz', 'list']);
  }

  startQuiz(id: number): Observable<QuizDto> {
    return this.quizApi.quizStartCreate({quizId: id});
  }

  createQuizFromTemplate(quizTemplateId: number): Observable<QuizDto> {
    return this.quizApi.quizCreate({createQuizInputRequestDto: {quiz_template_id: quizTemplateId}});
  }

  closeQuiz(id: number): Observable<QuizDto> {
    return this.quizApi.quizCloseCreate({quizId: id});
  }

  goStart(id: number, onError?: (err: unknown) => void): void {
    this.startQuiz(id).subscribe({
      next: (session: QuizDto): void => {
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

    return this.questionApi.questionList({
      active: true,
      isModePractice: true,
      pageSize: 1,
      subjectIds,
    }).pipe(
      map((response) => ({count: response.count})),
    );
  }

  generateQuiz(payload: GenerateFromSubjectsInputRequestDto): Observable<QuizDto> {
    return this.qtApi.quizTemplateGenerateFromSubjectsCreate({generateFromSubjectsInputRequestDto: payload}).pipe(
      switchMap((quizTemplate) => this.createQuizFromTemplate(quizTemplate.id)),
    );
  }

  listQuiz(params?: {name?: string; search?: string}): Observable<QuizListDto[]> {
    // The session list is paginated (DRF PageNumberPagination, page size 20).
    // Reading only page 1 made the quiz-block CTA wrong when the relevant
    // session sat on a later page (it would show "Start" and risk a duplicate
    // session). Walk every page via ``next`` and concatenate the results.
    const fetchAll = this.fetchAllQuizPages(1, params).pipe(
      expand(({page}) =>
        page.next ? this.fetchAllQuizPages(page.nextPageNumber, params) : EMPTY,
      ),
      reduce<{page: {results: QuizListDto[]}}, QuizListDto[]>(
        (acc, {page}) => acc.concat(page.results ?? []),
        [],
      ),
    );

    // Only the unfiltered call (the quiz-block fan-out) is deduped; filtered
    // searches stay independent.
    if (params?.name || params?.search) {
      return fetchAll;
    }
    if (this.listQuizAll$) {
      return this.listQuizAll$;
    }
    this.listQuizAll$ = fetchAll.pipe(
      finalize(() => {
        this.listQuizAll$ = null;
      }),
      shareReplay(1),
    );
    return this.listQuizAll$;
  }

  /** One paginated page of ``GET /api/quiz/`` plus the bookkeeping the
   *  ``expand`` in :meth:`listQuiz` needs to decide whether to fetch the
   *  next one. ``next`` is a server URL, but the generated client only
   *  accepts a numeric ``page``, so we increment it ourselves. */
  private fetchAllQuizPages(
    page: number,
    params?: {name?: string; search?: string},
  ): Observable<{page: {results: QuizListDto[]; next: string | null; nextPageNumber: number}}> {
    return this.quizApi
      .quizList({name: params?.name, search: params?.search, page})
      .pipe(
        map((response) => ({
          page: {
            results: response.results ?? [],
            next: response.next ?? null,
            nextPageNumber: page + 1,
          },
        })),
      );
  }

  listTemplates(): Observable<QuizTemplateListDto[]> {
    return this.qtApi.quizTemplateList({}).pipe(map((response) => response.results ?? []));
  }

  assignTemplateToUsers(quizTemplateId: number, userIds: number[]): Observable<QuizListDto[]> {
    return this.http.post<QuizListDto[]>(`${this.apiBaseUrl}/quiz/bulk-create-from-template/`, {
      quiz_template_id: quizTemplateId,
      user_ids: userIds,
    });
  }

  listTemplateSessions(quizTemplateId: number): Observable<QuizAssignmentListDto[]> {
    return this.qtApi.quizTemplateSessionsList({qtId: quizTemplateId}).pipe(
      map((response: QuizAssignmentListDto[] | PaginatedQuizAssignmentListListDto) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results ?? [];
      }),
    );
  }

  deleteQuiz(id: number): Observable<void> {
    return this.quizApi.quizDestroy({quizId: id}).pipe(
      map(() => void 0),
    );
  }

  retrieveQuiz(id: number): Observable<QuizDto> {
    return this.quizApi.quizRetrieve({quizId: id});
  }

  saveAnswer(
    quizId: number,
    payload: QuizQuestionAnswerWriteRequestDto,
  ): Observable<QuizQuestionAnswerDto> {
    if (payload.question_id == null) {
      throw new Error('question_id is required');
    }

    return this.answerApi.quizAnswerCreate({quizId, quizQuestionAnswerWriteRequestDto: payload});
  }

  listAnswers(quizId: number): Observable<QuizQuestionAnswerDto[]> {
    return this.answerApi.quizAnswerList({quizId}).pipe(map((response) => response.results ?? []));
  }

  exportPdf(quizId: number): Observable<Blob> {
    return this.http.get(`${this.apiBaseUrl}/quiz/${quizId}/export-pdf/`, {responseType: 'blob'});
  }

  goQuickQuiz(): void {
    this.router.navigate(['/quiz/quick']);
  }
}
