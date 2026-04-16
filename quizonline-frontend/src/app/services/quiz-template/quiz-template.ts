import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {QuizTemplateApi as QuizTemplateApiService} from '../../api/generated/api/quiz-template.service';
import {PatchedQuizTemplatePartialRequestDto} from '../../api/generated/model/patched-quiz-template-partial-request';
import {QuizQuestionReadDto} from '../../api/generated/model/quiz-question-read';
import {QuizQuestionWriteRequestDto} from '../../api/generated/model/quiz-question-write-request';
import {QuizTemplateDto} from '../../api/generated/model/quiz-template';
import {QuizTemplateWriteRequestDto} from '../../api/generated/model/quiz-template-write-request';

@Injectable({
  providedIn: 'root',
})
export class QuizTemplateService {
    private readonly api = inject(QuizTemplateApiService);

  list(): Observable<QuizTemplateDto[]> {
    return this.api.quizTemplateList({}).pipe(map((response) => response.results ?? []));
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
    return this.api.quizTemplateUpdate({qtId: quizTemplateId, quizTemplateWriteRequestDto: payload});
  }

  partialUpdate(
    quizTemplateId: number,
    payload: PatchedQuizTemplatePartialRequestDto,
  ): Observable<QuizTemplateDto> {
    return this.api.quizTemplatePartialUpdate({qtId: quizTemplateId, patchedQuizTemplatePartialRequestDto: payload});
  }

  destroy(quizTemplateId: number): Observable<void> {
    return this.api.quizTemplateDestroy({qtId: quizTemplateId}).pipe(map(() => void 0));
  }

  listQuestions(quizTemplateId: number): Observable<QuizQuestionReadDto[]> {
    return this.api.quizTemplateQuestionList({qtId: quizTemplateId}).pipe(
      map((response) => response.results ?? []),
    );
  }

  addQuestion(
    quizTemplateId: number,
    payload: QuizQuestionWriteRequestDto,
  ): Observable<QuizQuestionReadDto> {
    return this.api.quizTemplateQuestionCreate({qtId: quizTemplateId, quizQuestionWriteRequestDto: payload});
  }

  updateQuestion(
    quizTemplateId: number,
    quizQuestionId: number,
    payload: QuizQuestionWriteRequestDto,
  ): Observable<QuizQuestionReadDto> {
    return this.api.quizTemplateQuestionUpdate({qqId: quizQuestionId, qtId: quizTemplateId, quizQuestionWriteRequestDto: payload});
  }

  removeQuestion(quizTemplateId: number, quizQuestionId: number): Observable<void> {
    return this.api.quizTemplateQuestionDestroy({qqId: quizQuestionId, qtId: quizTemplateId}).pipe(map(() => void 0));
  }
}
