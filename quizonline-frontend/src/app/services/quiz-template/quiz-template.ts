import {Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';

import {
  PatchedQuizTemplatePartialRequest,
  QuizQuestionRead,
  QuizQuestionWriteRequest,
  QuizTemplateService as QuizTemplateApiService,
  QuizTemplate,
  QuizTemplateWriteRequest,
} from '../../api/generated';

@Injectable({
  providedIn: 'root',
})
export class QuizTemplateService {
  constructor(private api: QuizTemplateApiService) {}

  list(): Observable<QuizTemplate[]> {
    return this.api.quizTemplateList().pipe(map((response) => response.results ?? []));
  }

  retrieve(quizTemplateId: number): Observable<QuizTemplate> {
    return this.api.quizTemplateRetrieve(quizTemplateId);
  }

  create(payload: QuizTemplateWriteRequest): Observable<QuizTemplate> {
    return this.api.quizTemplateCreate(payload);
  }

  update(
    quizTemplateId: number,
    payload: QuizTemplateWriteRequest,
  ): Observable<QuizTemplate> {
    return this.api.quizTemplateUpdate(quizTemplateId, payload);
  }

  partialUpdate(
    quizTemplateId: number,
    payload: PatchedQuizTemplatePartialRequest,
  ): Observable<QuizTemplate> {
    return this.api.quizTemplatePartialUpdate(quizTemplateId, payload);
  }

  destroy(quizTemplateId: number): Observable<void> {
    return this.api.quizTemplateDestroy(quizTemplateId).pipe(map(() => void 0));
  }

  listQuestions(quizTemplateId: number): Observable<QuizQuestionRead[]> {
    return this.api.quizTemplateQuestionList(quizTemplateId).pipe(
      map((response) => response.results ?? []),
    );
  }

  addQuestion(
    quizTemplateId: number,
    payload: QuizQuestionWriteRequest,
  ): Observable<QuizQuestionRead> {
    return this.api.quizTemplateQuestionCreate(quizTemplateId, payload);
  }

  updateQuestion(
    quizTemplateId: number,
    quizQuestionId: number,
    payload: QuizQuestionWriteRequest,
  ): Observable<QuizQuestionRead> {
    return this.api.quizTemplateQuestionUpdate(quizQuestionId, quizTemplateId, payload);
  }

  removeQuestion(quizTemplateId: number, quizQuestionId: number): Observable<void> {
    return this.api.quizTemplateQuestionDestroy(quizQuestionId, quizTemplateId).pipe(map(() => void 0));
  }
}
