import {Injectable, inject} from '@angular/core';
import {map, Observable, of, shareReplay, tap} from 'rxjs';

import {QuizTemplateApi as QuizTemplateApiService} from '../../api/generated/api/quiz-template.service';
import {PatchedQuizTemplatePartialRequestDto} from '../../api/generated/model/patched-quiz-template-partial-request';
import {QuizQuestionReadDto} from '../../api/generated/model/quiz-question-read';
import {QuizQuestionWriteRequestDto} from '../../api/generated/model/quiz-question-write-request';
import {QuizTemplateDto} from '../../api/generated/model/quiz-template';
import {QuizTemplateListDto} from '../../api/generated/model/quiz-template-list';
import {QuizTemplateWriteRequestDto} from '../../api/generated/model/quiz-template-write-request';

@Injectable({
  providedIn: 'root',
})
export class QuizTemplateService {
    private readonly api = inject(QuizTemplateApiService);

  /** Per-domain TTL cache for the picker-sized list. Several
   *  ``<app-quiz-block-editor>`` instances on the same lesson would
   *  otherwise each fire their own ``quizTemplateList()`` call on
   *  mount — N blocks → N identical listings hitting the backend.
   *  60 s is enough to absorb a typical lesson-edit session (open,
   *  add a few quiz blocks, configure, save) without ever showing
   *  stale data the author authored elsewhere — and every write
   *  method below busts the cache outright. */
  private readonly pickerCacheTtlMs = 60_000;
  private readonly pickerCache = new Map<
    string,
    {at: number; data: QuizTemplateListDto[]}
  >();

  list(): Observable<QuizTemplateListDto[]> {
    return this.api.quizTemplateList({}).pipe(map((response) => response.results ?? []));
  }

  /** Same payload as :func:`list` but cached per ``domainId`` (or
   *  ``null`` for "every accessible domain") with a short TTL so
   *  concurrent block-editor mounts share a single API round-trip.
   *  Client-side narrows to ``domainId`` so the picker only ever
   *  surfaces templates from the host's domain. */
  listForPicker(domainId: number | null): Observable<QuizTemplateListDto[]> {
    const key = domainId == null ? '__all__' : String(domainId);
    const cached = this.pickerCache.get(key);
    if (cached && Date.now() - cached.at < this.pickerCacheTtlMs) {
      return of(cached.data);
    }
    return this.api.quizTemplateList({}).pipe(
      map((response) => {
        const list = response.results ?? [];
        return domainId == null ? list : list.filter((t) => t.domain === domainId);
      }),
      tap((scoped) => {
        this.pickerCache.set(key, {at: Date.now(), data: scoped});
      }),
      shareReplay({bufferSize: 1, refCount: true}),
    );
  }

  /** Drop every entry in the picker cache. Called from create /
   *  update / destroy so the next picker open fetches the fresh
   *  list instead of showing the author the pre-write snapshot. */
  private invalidatePickerCache(): void {
    this.pickerCache.clear();
  }

  retrieve(quizTemplateId: number): Observable<QuizTemplateDto> {
    return this.api.quizTemplateRetrieve({qtId: quizTemplateId});
  }

  create(payload: QuizTemplateWriteRequestDto): Observable<QuizTemplateDto> {
    return this.api.quizTemplateCreate({quizTemplateWriteRequestDto: payload}).pipe(
      tap(() => this.invalidatePickerCache()),
    );
  }

  update(
    quizTemplateId: number,
    payload: QuizTemplateWriteRequestDto,
  ): Observable<QuizTemplateDto> {
    return this.api.quizTemplateUpdate({qtId: quizTemplateId, quizTemplateWriteRequestDto: payload}).pipe(
      tap(() => this.invalidatePickerCache()),
    );
  }

  partialUpdate(
    quizTemplateId: number,
    payload: PatchedQuizTemplatePartialRequestDto,
  ): Observable<QuizTemplateDto> {
    return this.api.quizTemplatePartialUpdate({qtId: quizTemplateId, patchedQuizTemplatePartialRequestDto: payload}).pipe(
      tap(() => this.invalidatePickerCache()),
    );
  }

  destroy(quizTemplateId: number): Observable<void> {
    return this.api.quizTemplateDestroy({qtId: quizTemplateId}).pipe(
      tap(() => this.invalidatePickerCache()),
      map(() => void 0),
    );
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
