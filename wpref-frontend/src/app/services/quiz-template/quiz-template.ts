import {Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';

import {
  PatchedQuizTemplatePartialRequestDto,
  QuizQuestionReadDto,
  QuizQuestionWriteRequestDto,
  QuizTemplateApi,
  QuizTemplateDto,
  QuizTemplateWriteRequestDto,
} from '../../api/generated';

@Injectable({
  providedIn: 'root',
})
export class QuizTemplateService {
  constructor(private api: QuizTemplateApi) {}

  list(): Observable<QuizTemplateDto[]> {
    return this.api.quizTemplateList();
  }

  retrieve(quizTemplateId: number): Observable<QuizTemplateDto> {
    return this.api.quizTemplateRetrieve({qtId: quizTemplateId});
  }

  create(payload: QuizTemplateWriteRequestDto): Observable<QuizTemplateDto> {
    return this.api.quizTemplateCreate({quizTemplateWriteRequestDto: payload});
  }

  update(
    quizTemplateId: number,
    payload: QuizTemplateWriteRequestDto,
  ): Observable<QuizTemplateDto> {
    return this.api.quizTemplateUpdate({
      qtId: quizTemplateId,
      quizTemplateWriteRequestDto: payload,
    });
  }

  partialUpdate(
    quizTemplateId: number,
    payload: PatchedQuizTemplatePartialRequestDto,
  ): Observable<QuizTemplateDto> {
    return this.api.quizTemplatePartialUpdate({
      qtId: quizTemplateId,
      patchedQuizTemplatePartialRequestDto: payload,
    });
  }

  destroy(quizTemplateId: number): Observable<void> {
    return this.api.quizTemplateDestroy({qtId: quizTemplateId}).pipe(map(() => void 0));
  }

  listQuestions(quizTemplateId: number): Observable<QuizQuestionReadDto[]> {
    return this.api.quizTemplateQuestionList({qtId: quizTemplateId});
  }

  addQuestion(
    quizTemplateId: number,
    payload: QuizQuestionWriteRequestDto,
  ): Observable<QuizQuestionReadDto> {
    return this.api.quizTemplateQuestionCreate({
      qtId: quizTemplateId,
      quizQuestionWriteRequestDto: payload,
    });
  }

  updateQuestion(
    quizTemplateId: number,
    quizQuestionId: number,
    payload: QuizQuestionWriteRequestDto,
  ): Observable<QuizQuestionReadDto> {
    return this.api.quizTemplateQuestionUpdate({
      qtId: quizTemplateId,
      qqId: quizQuestionId,
      quizQuestionWriteRequestDto: payload,
    });
  }

  removeQuestion(quizTemplateId: number, quizQuestionId: number): Observable<void> {
    return this.api.quizTemplateQuestionDestroy({
      qtId: quizTemplateId,
      qqId: quizQuestionId,
    }).pipe(map(() => void 0));
  }
}
