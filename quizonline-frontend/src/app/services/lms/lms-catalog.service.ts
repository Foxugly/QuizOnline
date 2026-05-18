import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/** Read-only row exposed by ``GET /api/lms/course/{id}/audit-log/``.
 *  Mirrors the ``CourseAuditLogSerializer`` shape — kept here as a
 *  local type rather than going through the generated OpenAPI client
 *  to match the rest of this service. */
export interface CourseAuditEntryDto {
  id: number;
  action: string;
  actor_username: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

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

  list(params: {search?: string; level?: string; domain?: number} = {}): Observable<{count: number; results: unknown[]}> {
    let httpParams = new HttpParams();
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.level) {
      httpParams = httpParams.set('level', params.level);
    }
    if (params.domain) {
      httpParams = httpParams.set('domain', String(params.domain));
    }
    return this.http.get<{count: number; results: unknown[]}>(`${this.baseUrl}/course/`, {params: httpParams});
  }

  /**
   * Create a new LMS course. ``payload`` is forwarded as-is so the caller
   * decides between sending JSON (no cover image) or ``FormData`` (with
   * upload) — the backend ``CourseWriteSerializer`` accepts both.
   */
  create(payload: unknown): Observable<{id: number; slug: string}> {
    return this.http.post<{id: number; slug: string}>(`${this.baseUrl}/course/`, payload);
  }

  detailBySlug(slug: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/course/by-slug/${encodeURIComponent(slug)}/`);
  }

  detailById(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/course/${id}/`);
  }

  /** Read-only audit log for a course — instructor-gated server-side.
   *  Returns the last 100 rows ordered newest-first. */
  courseAuditLog(id: number): Observable<CourseAuditEntryDto[]> {
    return this.http.get<CourseAuditEntryDto[]>(`${this.baseUrl}/course/${id}/audit-log/`);
  }

  /** Instructor-gated export — returns the course as a portable JSON
   *  dict ready to be saved by the operator and re-imported. */
  exportCourse(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/course/${id}/export/`);
  }

  /** Re-create a course from an export payload into the target
   *  domain. ``target_domain_id`` is optional — falls back to the
   *  caller's current domain server-side. */
  importCourse(payload: unknown, targetDomainId?: number): Observable<{id: number; slug: string}> {
    const body: Record<string, unknown> = {payload};
    if (typeof targetDomainId === 'number') {
      body['target_domain_id'] = targetDomainId;
    }
    return this.http.post<{id: number; slug: string}>(`${this.baseUrl}/course/import/`, body);
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

  /**
   * Delete a course via ``DELETE /api/lms/course/{id}/``. Cascades to all
   * sections, lessons, content blocks and learner enrollments / progress
   * via standard ORM ``on_delete=CASCADE`` rules. Will surface a 4xx
   * error from the backend when a non-cascade FK protects deletion
   * (notably ``Certificate.course`` is ``on_delete=PROTECT``, so any
   * course that has issued certificates cannot be deleted).
   */
  deleteCourse(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/course/${id}/`);
  }

  /**
   * Update a course via ``PATCH /api/lms/course/{id}/``. ``payload`` is
   * forwarded as JSON — for cover-image uploads use the dedicated
   * :meth:`uploadCourseCoverImage` companion below which switches to
   * multipart form-data.
   */
  updateCourse(id: number, payload: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<unknown>(`${this.baseUrl}/course/${id}/`, payload);
  }

  /**
   * Replace a course's ``cover_image`` via multipart form-data. Mirrors
   * the :class:`LmsUploadService` pattern used by the lesson block
   * editors: a single-field PATCH so DRF's parser negotiation can
   * decode the file without us having to JSON-encode binary content.
   */
  uploadCourseCoverImage(id: number, file: File): Observable<unknown> {
    const fd = new FormData();
    fd.append('cover_image', file);
    return this.http.patch<unknown>(`${this.baseUrl}/course/${id}/`, fd);
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

  // -- Section CRUD --------------------------------------------------------

  createSection(payload: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/section/`, payload);
  }

  updateSection(id: number, payload: unknown): Observable<unknown> {
    return this.http.patch<unknown>(`${this.baseUrl}/section/${id}/`, payload);
  }

  deleteSection(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/section/${id}/`);
  }

  // -- Lesson CRUD ---------------------------------------------------------

  createLesson(payload: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/lesson/`, payload);
  }

  updateLesson(id: number, payload: unknown): Observable<unknown> {
    return this.http.patch<unknown>(`${this.baseUrl}/lesson/${id}/`, payload);
  }

  deleteLesson(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/lesson/${id}/`);
  }
}
