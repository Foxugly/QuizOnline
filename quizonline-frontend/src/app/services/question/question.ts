import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {FormArray, FormControl, FormGroup} from '@angular/forms';
import {Router} from '@angular/router';
import {EMPTY, expand, map, Observable, reduce} from 'rxjs';

import {ROUTES} from '../../app.routes-paths';
import {
  LanguageEnumDto,
  MediaAssetDto,
  PaginatedQuestionReadListDto,
  QuestionApi,
  QuestionCreateRequestParams,
  QuestionDestroyRequestParams,
  QuestionListRequestParams,
  QuestionMediaCreateRequestParams,
  QuestionPartialUpdateRequestParams,
  QuestionReadDto,
  QuestionRetrieveRequestParams,
  QuestionUpdateRequestParams,
  QuestionWritePayloadRequestDto,
  PatchedQuestionPartialWritePayloadRequestDto,
} from '../../api/generated';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {selectTranslation} from '../../shared/i18n/select-translation';
import {LangCode} from '../translation/translation';

export type QuestionTrGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  explanation: FormControl<string>;
  answer_options: FormArray<AnswerTrGroup>;
}>;

export type AnswerTrGroup = FormGroup<{
  content: FormControl<string>;
}>;

export type QuestionTranslationForm = {
  title: string;
  description: string;
  explanation: string;
};

export type AnswerOptionForm = {
  id?: number;
  is_correct: boolean;
  sort_order: number;
  translations: Partial<Record<LangCode, { content: string }>>;
};

export type QuestionCreateJsonPayload = {
  domain: number;
  subject_ids: number[];
  allow_multiple_correct: boolean;
  active: boolean;
  is_mode_practice: boolean;
  is_mode_exam: boolean;
  translations: Partial<Record<LangCode, QuestionTranslationForm>>;
  answer_options: Array<AnswerOptionForm>;
  media_asset_ids: number[];
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
    translations: Partial<Record<LangCode, { content: string }>>;
  }>;
  media: Array<{
    id: number;
    kind: MediaAssetDto['kind'];
    sort_order: number;
    file: string | null;
    external_url: string | null;
  }>;
};

export type StructuredQuestionTranslations = Partial<Record<LangCode, QuestionTranslationForm>>;
export type StructuredAnswerTranslations = Partial<Record<LangCode, { content: string }>>;

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

  constructor(private api: QuestionApi, private router: Router, private http: HttpClient) {
  }

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

    const requestParams: QuestionListRequestParams = {
      active: params?.active,
      search: params?.search,
      domain: params?.domainId,
      isModePractice: params?.isModePractice,
      isModeExam: params?.isModeExam,
      page: params?.page,
      pageSize: params?.pageSize,
      subjectIds,
    };

    return this.api.questionList(requestParams);
  }

  retrieve(questionId: number): Observable<QuestionReadDto> {
    const requestParams: QuestionRetrieveRequestParams = {questionId};
    return this.api.questionRetrieve(requestParams);
  }

  create(question: QuestionWritePayloadRequestDto): Observable<QuestionReadDto> {
    const requestParams: QuestionCreateRequestParams = {
      questionWritePayloadRequestDto: question,
    };
    return this.api.questionCreate(requestParams);
  }

  update(qurp: QuestionUpdateRequestParams): Observable<QuestionReadDto> {
    return this.api.questionUpdate(qurp);
  }

  updatePartial(questionId: number, payload: PatchedQuestionPartialWritePayloadRequestDto): Observable<QuestionReadDto> {
    const requestParams: QuestionPartialUpdateRequestParams = {
      questionId,
      patchedQuestionPartialWritePayloadRequestDto: payload,
    };
    return this.api.questionPartialUpdate(requestParams);
  }

  delete(questionId: number): Observable<void> {
    const requestParams: QuestionDestroyRequestParams = {questionId};
    return this.api.questionDestroy(requestParams).pipe(map(() => void 0));
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
      translations: Object.fromEntries(
        Object.entries(question.translations ?? {}).map(([lang, value]) => [
          lang,
          {
            title: value?.title ?? '',
            description: value?.description ?? '',
            explanation: value?.explanation ?? '',
          },
        ]),
      ) as Record<LangCode, QuestionTranslationForm>,
      answerOptions: [...(question.answer_options ?? [])]
        .sort((left, right) => (left.sort_order ?? left.id) - (right.sort_order ?? right.id))
        .map((answer, index) => ({
          is_correct: !!answer.is_correct,
          sort_order: answer.sort_order ?? index + 1,
          translations: Object.fromEntries(
            Object.entries(answer.translations ?? {}).map(([lang, value]) => [
              lang,
              {content: value?.content ?? ''},
            ]),
          ) as Record<LangCode, { content: string }>,
        })),
      media: (question.media ?? []).map((media, index) => ({
        id: media.asset.id,
        kind: media.asset.kind,
        sort_order: media.sort_order ?? index + 1,
        file: media.asset.file ?? null,
        external_url: media.asset.external_url ?? null,
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
      {title: '', description: '', explanation: ''}
    );
  }

  questionMediaCreate(param: QuestionMediaCreateRequestParams): Observable<MediaAssetDto> {
    return this.api.questionMediaCreate(param);
  }

  exportStructured(domainId: number): Observable<Blob> {
    return this.http.get(`${this.apiBaseUrl}/export-structured/`, {
      params: {domain: String(domainId)},
      responseType: 'blob',
    });
  }

  importStructured(payload: StructuredQuestionImportFile): Observable<StructuredQuestionImportResult> {
    return this.http.post<StructuredQuestionImportResult>(`${this.apiBaseUrl}/import-structured/`, payload);
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
