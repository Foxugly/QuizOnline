import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {map, Observable} from 'rxjs';

import {ROUTES} from '../../app.routes-paths'
import {
  PatchedSubjectPartialRequest,
  SubjectService as SubjectApiService,
  SubjectDetail,
  SubjectRead,
  SubjectWriteRequest
} from '../../api/generated';
import {FormControl, FormGroup} from '@angular/forms';
import {LangCode} from '../translation/translation';

export type SubjectTranslationDto = { name: string; description: string; domain:{id:number; name:string}};
export type SubjectTranslationWrite = { name: string; description: string };
export type SubjectTranslationsWrite = Record<string, SubjectTranslationWrite>;
export type SubjectLangGroup = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string>;
}>;

@Injectable({
  providedIn: 'root',
})
export class SubjectService {

  constructor(private api: SubjectApiService, private router: Router) {
  }

  list(params?: { search?: string; domainId?: number; active?: boolean }): Observable<SubjectRead[]> {
    return this.api.subjectList(
      params?.active,
      params?.domainId,
      undefined,
      params?.search,
    ).pipe(map((response) => response.results ?? []));
  }

  retrieve(subjectId: number): Observable<SubjectRead> {
    return this.api.subjectRetrieve(subjectId);
  }

  detail(subjectId: number): Observable<SubjectDetail> {
    return this.api.subjectDetailsRetrieve(subjectId);
  }

  create(payload: SubjectWriteRequest): Observable<SubjectRead> {
    return this.api.subjectCreate(payload);
  }

  update(subjectId: number, payload: SubjectWriteRequest): Observable<SubjectRead> {
    return this.api.subjectUpdate(subjectId, payload);
  }

  updatePartial(subjectId: number, payload: PatchedSubjectPartialRequest): Observable<SubjectRead> {
    return this.api.subjectPartialUpdate(subjectId, payload);
  }

  delete(subjectId: number): Observable<void> {
    return this.api.subjectDestroy(subjectId).pipe(map(() => void 0));
  }

  goQuestionNew(): void {
    this.router.navigate(ROUTES.question.add());
  }

  goNew(): void {
    this.router.navigate(ROUTES.subject.add());
  }

  goList(): void {
    this.router.navigate(ROUTES.subject.list());
  }

  goBack(): void {
    this.router.navigate(ROUTES.subject.list());
  }

  goEdit(subjectId: number): void {
    this.router.navigate(ROUTES.subject.edit(subjectId));
  }

  goDelete(subjectId: number): void {
    this.router.navigate(ROUTES.subject.delete(subjectId));
  }

  buildWritePayload(domainId: number, translations: SubjectTranslationsWrite): SubjectWriteRequest {
    return {domain: domainId, translations} as SubjectWriteRequest;
  }
}
