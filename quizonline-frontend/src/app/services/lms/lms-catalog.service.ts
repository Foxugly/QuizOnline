import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/**
 * Thin wrapper around the LMS catalog REST endpoints. Falls back to direct
 * ``HttpClient`` calls instead of the generated client because the generated
 * methods are heavily-typed but expose awkward ``requestParameters`` objects
 * that don't compose well with optional filters; routing through ``HttpClient``
 * keeps the call sites trivial and is consistent with the existing
 * :class:`DomainService` pattern.
 */
@Injectable({providedIn: 'root'})
export class LmsCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/lms`;

  list(params: {search?: string; level?: string} = {}): Observable<{count: number; results: unknown[]}> {
    let httpParams = new HttpParams();
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.level) {
      httpParams = httpParams.set('level', params.level);
    }
    return this.http.get<{count: number; results: unknown[]}>(`${this.baseUrl}/course/`, {params: httpParams});
  }

  detailBySlug(slug: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/course/by-slug/${encodeURIComponent(slug)}/`);
  }

  detailById(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/course/${id}/`);
  }

  publish(id: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/course/${id}/publish/`, {});
  }

  unpublish(id: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/course/${id}/unpublish/`, {});
  }

  clone(id: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/course/${id}/clone/`, {});
  }

  reorderSections(courseId: number, ids: number[]): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/course/${courseId}/section/reorder/`, {ids});
  }

  reorderLessons(sectionId: number, ids: number[]): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/section/${sectionId}/lesson/reorder/`, {ids});
  }

  reorderBlocks(lessonId: number, ids: number[]): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/lesson/${lessonId}/block/reorder/`, {ids});
  }
}
