import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

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

  verify(token: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/verify/${encodeURIComponent(token)}/`);
  }
}
