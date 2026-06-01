import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {Router} from '@angular/router';
import {EMPTY, expand, map, Observable, reduce} from 'rxjs';

import {ROUTES} from '../../app.routes-paths';
import {QuestionApi as QuestionApiService} from '../../api/generated/api/question.service';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {PaginatedQuestionReadListDto} from '../../api/generated/model/paginated-question-read-list';
import {PatchedQuestionPartialWritePayloadRequestDto} from '../../api/generated/model/patched-question-partial-write-payload-request';
import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuestionWritePayloadRequestDto} from '../../api/generated/model/question-write-payload-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {selectTranslation} from '../../shared/i18n/select-translation';
import {LangCode} from '../translation/translation';

/**
 * Reactive form group used per language inside
 * ``QuestionEditorForm.translations``. Phase 3.5: the rich-text
 * ``description`` / ``explanation`` siblings are gone — they now
 * live as polymorphic ``Block`` rows on the Question host and are
 * edited through the block-list editor instead of inline form
 * controls. Only the short ``title`` remains here.
 */
export type QuestionTrGroup = FormGroup<{
  title: FormControl<string>;
}>;

export type QuestionTranslationForm = {
  title: string;
};

/**
 * Wire-shape for one answer option in the create / patch payload.
 *
 * Phase 3.5: the legacy per-language ``translations.{lang}.content``
 * has migrated to the polymorphic block list — each option owns its
 * own ``Block`` rows. The write payload now only carries the
 * structural metadata (``is_correct``, ``sort_order``); the answer's
 * visible content is patched through ``/api/block/`` once the
 * option has its id.
 */
export type AnswerOptionForm = {
  id?: number;
  is_correct: boolean;
  sort_order: number;
};

export type QuestionDuplicateDraft = {
  domainId: number;
  subjectIds: number[];
  active: boolean;
  isModePractice: boolean;
  isModeExam: boolean;
  translations: Partial<Record<LangCode, QuestionTranslationForm>>;
  answerOptions: Array<{
    is_correct: boolean;
    sort_order: number;
  }>;
};

/**
 * Wire-shape consumed by the structured-import payload (different
 * from :type:`QuestionTranslationForm` because the legacy file
 * format may still carry the rich-text ``description`` /
 * ``explanation`` fields that the backend's
 * ``_legacy_content_translations_to_blocks`` helper converts to
 * Block rows on import).
 */
export type StructuredQuestionTranslations = Partial<Record<LangCode, {
  title: string;
  description?: string;
  explanation?: string;
}>>;
export type StructuredAnswerTranslations = Partial<Record<LangCode, {content: string}>>;

export type StructuredQuestionAnswerOption = {
  id?: number;
  sort_order: number;
  is_correct: boolean;
  translations: StructuredAnswerTranslations;
};

export type StructuredSubjectItem = {
  id: number;
  hash?: string;
  translations: Partial<Record<LangCode, { name: string }>>;
};

export type StructuredDomainItem = {
  id: number;
  hash?: string;
  translations: Partial<Record<LangCode, { name: string; description: string }>>;
};

export type StructuredQuestionItem = {
  id?: number;
  domain_id: number;
  subject_ids: number[];
  active: boolean;
  allow_multiple_correct: boolean;
  is_mode_practice: boolean;
  is_mode_exam: boolean;
  translations: StructuredQuestionTranslations;
  answer_options: StructuredQuestionAnswerOption[];
};

export type StructuredQuestionImportFile = {
  version: '1.0';
  exported_at?: string;
  domain: StructuredDomainItem;
  subjects: StructuredSubjectItem[];
  questions: StructuredQuestionItem[];
};

export type StructuredQuestionImportResult = {
  domain_created: boolean;
  domain_id: number;
  domain_remapped: boolean;
  subjects_created: number;
  subject_remaps: Record<string, number>;
  questions_created: number;
  questions_updated: number;
};

@Injectable({providedIn: 'root'})
export class QuestionService {
  private static readonly DUPLICATE_DRAFT_STORAGE_KEY = 'question.duplicateDraft';
  private duplicateDraft: QuestionDuplicateDraft | null = null;
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/question`;

    private readonly api = inject(QuestionApiService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  list(params?: {
    search?: string;
    subjectId?: number;
    subjectIds?: number[];
    domainId?: number;
    active?: boolean;
    isModePractice?: boolean;
    isModeExam?: boolean;
  }): Observable<QuestionReadDto[]> {
    return this.listPage({
      ...params,
      page: 1,
      pageSize: 100,
    }).pipe(
      expand((response, index) => {
        if (!response.next) {
          return EMPTY;
        }
        return this.listPage({
          ...params,
          page: index + 2,
          pageSize: 100,
        });
      }),
      map((response) => response.results ?? []),
      reduce((all, page) => [...all, ...page], [] as QuestionReadDto[]),
    );
  }

  listPage(params?: {
    search?: string;
    subjectId?: number;
    subjectIds?: number[];
    domainId?: number;
    active?: boolean;
    isModePractice?: boolean;
    isModeExam?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedQuestionReadListDto> {
    const subjectIds = params?.subjectIds?.length
      ? params.subjectIds
      : (params?.subjectId ? [params.subjectId] : undefined);

    return this.api.questionList({
      active: params?.active,
      domain: params?.domainId,
      isModeExam: params?.isModeExam,
      isModePractice: params?.isModePractice,
      page: params?.page,
      pageSize: params?.pageSize,
      search: params?.search,
      subjectIds,
    });
  }

  retrieve(questionId: number): Observable<QuestionReadDto> {
    return this.api.questionRetrieve({questionId});
  }

  create(question: QuestionWritePayloadRequestDto): Observable<QuestionReadDto> {
    return this.api.questionCreate({questionWritePayloadRequestDto: question});
  }

  update(questionId: number, payload: QuestionWritePayloadRequestDto): Observable<QuestionReadDto> {
    return this.api.questionUpdate({questionId, questionWritePayloadRequestDto: payload});
  }

  updatePartial(questionId: number, payload: PatchedQuestionPartialWritePayloadRequestDto): Observable<QuestionReadDto> {
    return this.api.questionPartialUpdate({questionId, patchedQuestionPartialWritePayloadRequestDto: payload});
  }

  delete(questionId: number): Observable<void> {
    return this.api.questionDestroy({questionId}).pipe(map(() => void 0));
  }

  goList(): void {
    this.router.navigate(ROUTES.question.list());
  }

  goNew(domainId?: number): void {
    this.router.navigate(ROUTES.question.add(), {
      queryParams: domainId ? {domainId} : undefined,
    });
  }

  goImport(): void {
    this.router.navigate(ROUTES.question.import());
  }

  duplicateToNew(question: QuestionReadDto): void {
    const draft: QuestionDuplicateDraft = {
      domainId: question.domain.id,
      subjectIds: question.subjects.map((subject) => subject.id),
      active: !!question.active,
      isModePractice: !!question.is_mode_practice,
      isModeExam: !!question.is_mode_exam,
      // Phase 3.5: ``description`` / ``explanation`` / answer
      // ``content`` migrated to the polymorphic Block table. The
      // duplicate draft keeps only the title and structural metadata
      // — the user re-attaches block content in the duplicate's
      // editor after the question is created.
      translations: Object.fromEntries(
        Object.entries(question.translations ?? {}).map(([lang, value]) => [
          lang,
          {
            title: (value as { title?: string } | undefined)?.title ?? '',
          },
        ]),
      ) as Record<LangCode, QuestionTranslationForm>,
      answerOptions: [...(question.answer_options ?? [])]
        .sort((left, right) => (left.sort_order ?? left.id) - (right.sort_order ?? right.id))
        .map((answer, index) => ({
          is_correct: !!answer.is_correct,
          sort_order: answer.sort_order ?? index + 1,
        })),
    };

    this.duplicateDraft = draft;
    this.persistDuplicateDraft(draft);

    this.goNew(question.domain.id);
  }

  consumeDuplicateDraft(): QuestionDuplicateDraft | null {
    const draft = this.duplicateDraft ?? this.readPersistedDuplicateDraft();
    this.duplicateDraft = null;
    this.clearPersistedDuplicateDraft();
    return draft;
  }

  goEdit(questionId: number): void {
    this.router.navigate(ROUTES.question.edit(questionId));
  }

  goView(questionId: number): void {
    this.router.navigate(ROUTES.question.view(questionId));
  }

  goDelete(questionId: number): void {
    this.router.navigate(ROUTES.question.delete(questionId));
  }

  goBack(): void {
    this.router.navigate(ROUTES.question.list());
  }

  goSubjectEdit(subjectId: number): void {
    this.router.navigate(ROUTES.subject.edit(subjectId));
  }

  getQuestionTranslationForm(question: QuestionReadDto, lang: LanguageEnumDto): QuestionTranslationForm {
    const tr = question.translations as Record<string, QuestionTranslationForm> | undefined;
    return (
      selectTranslation<QuestionTranslationForm>(tr ?? {}, lang) ??
      {title: ''}
    );
  }

  exportStructured(domainId: number, questionIds?: number[]): Observable<{blob: Blob; filename: string}> {
    const params: Record<string, string> = {domain: String(domainId)};
    if (questionIds?.length) {
      params['ids'] = questionIds.join(',');
    }
    return this.http.get(`${this.apiBaseUrl}/export-structured/`, {
      params,
      responseType: 'blob',
      observe: 'response',
    }).pipe(
      map(response => {
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="?([^";\n]+)"?/);
        const filename = match?.[1] ?? `questions-domain-${domainId}`;
        return {blob: response.body!, filename};
      }),
    );
  }

  importStructured(payload: StructuredQuestionImportFile): Observable<StructuredQuestionImportResult> {
    return this.http.post<StructuredQuestionImportResult>(`${this.apiBaseUrl}/import-structured/`, payload);
  }

  importStructuredFormData(file: File): Observable<StructuredQuestionImportResult> {
    const formData = new FormData();
    formData.append('json_file', file);
    return this.http.post<StructuredQuestionImportResult>(`${this.apiBaseUrl}/import-structured/`, formData);
  }

  private persistDuplicateDraft(draft: QuestionDuplicateDraft): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(
      QuestionService.DUPLICATE_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
  }

  private readPersistedDuplicateDraft(): QuestionDuplicateDraft | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(QuestionService.DUPLICATE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as QuestionDuplicateDraft;
    } catch {
      this.clearPersistedDuplicateDraft();
      return null;
    }
  }

  private clearPersistedDuplicateDraft(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(QuestionService.DUPLICATE_DRAFT_STORAGE_KEY);
  }
}
