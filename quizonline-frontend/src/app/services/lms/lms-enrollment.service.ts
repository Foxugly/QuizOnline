import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {CourseEnrollmentDto} from '../../api/generated/model/course-enrollment';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/** DRF page envelope returned by paginated list endpoints. The enrollment list
 * goes through the default ``PageNumberPagination`` config so all list
 * responses are wrapped this way. */
interface PagedEnvelope<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Thin wrapper around the LMS enrollment / progress / certificate REST
 * endpoints. Same rationale as :class:`LmsCatalogService` — routes through
 * ``HttpClient`` for readable call sites and consistency with existing
 * services in this codebase.
 */
@Injectable({providedIn: 'root'})
export class LmsEnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/lms`;

  myEnrollments(params: {status?: string} = {}): Observable<unknown> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<unknown>(`${this.baseUrl}/enrollment/`, {params: httpParams});
  }

  /**
   * List every enrollment of ``courseId`` for an instructor of that course
   * (backend gates non-instructors down to their own row). Optional
   * ``status`` narrows the result set server-side.
   *
   * Unwraps the DRF page envelope so callers only see the rows — table
   * pagination on the enrollment-tab is purely client-side since the
   * volume per course is expected to stay in the low hundreds at most.
   */
  listForCourse(
    courseId: number,
    params: {status?: string} = {},
  ): Observable<CourseEnrollmentDto[]> {
    let httpParams = new HttpParams().set('course', String(courseId));
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http
      .get<CourseEnrollmentDto[] | PagedEnvelope<CourseEnrollmentDto>>(
        `${this.baseUrl}/enrollment/`,
        {params: httpParams},
      )
      .pipe(map((body) => (Array.isArray(body) ? body : body.results ?? [])));
  }

  approve(enrollmentId: number): Observable<CourseEnrollmentDto> {
    return this.http.post<CourseEnrollmentDto>(
      `${this.baseUrl}/enrollment/${enrollmentId}/approve/`,
      {},
    );
  }

  reject(enrollmentId: number, reason?: string): Observable<CourseEnrollmentDto> {
    const body: Record<string, unknown> = {};
    if (reason !== undefined && reason !== null && reason !== '') {
      body['reason'] = reason;
    }
    return this.http.post<CourseEnrollmentDto>(
      `${this.baseUrl}/enrollment/${enrollmentId}/reject/`,
      body,
    );
  }

  cancel(enrollmentId: number): Observable<CourseEnrollmentDto> {
    return this.http.post<CourseEnrollmentDto>(
      `${this.baseUrl}/enrollment/${enrollmentId}/cancel/`,
      {},
    );
  }

  enroll(courseId: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/course/${courseId}/enroll/`, {});
  }

  startLesson(lessonId: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/lesson/${lessonId}/start/`, {});
  }

  completeLesson(lessonId: number, progress = 100): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/lesson/${lessonId}/complete/`, {progress_percent: progress});
  }

  myProgress(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/progress/`);
  }

  myCertificates(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/certificate/`);
  }

  certificate(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/certificate/${id}/`);
  }

  verify(token: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/verify/${encodeURIComponent(token)}/`);
  }
}
