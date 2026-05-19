import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {CourseEnrollmentDto} from '../../api/generated/model/course-enrollment';
import {UserSummaryDto} from '../../api/generated/model/user-summary';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/** Read shape of a single ``CourseInvite`` row as exposed by
 *  ``/api/lms/course/{id}/invites/`` and the token-keyed endpoints.
 *  Mirrors :class:`CourseInviteSerializer` on the backend so the
 *  generated client and this hand-rolled wrapper stay in sync.
 *
 *  The ``course_*`` denormalized fields exist so the cold-from-email
 *  acceptance page can render the full course "card" (title + rich
 *  description + objectives + duration + level) without a second
 *  request to ``/api/lms/course/{slug}/``. */
export interface CourseInviteDto {
  id: number;
  token: string;
  course: number;
  course_title: string;
  course_slug: string;
  course_description: string;
  course_learning_objectives: string;
  course_estimated_duration: number;
  course_level: string;
  invitee: number;
  invitee_detail: UserSummaryDto | null;
  inviter: number | null;
  inviter_detail: UserSummaryDto | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expires_at: string;
  last_sent_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** DRF page envelope returned by paginated list endpoints. The enrollment list
 * goes through the default ``PageNumberPagination`` config so all list
 * responses are wrapped this way. */
interface PagedEnvelope<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Server-side analytics payload for a single course. Mirrors the shape
 *  returned by ``GET /api/lms/course/{id}/analytics/``. */
export interface CourseAnalyticsDto {
  enrollment_counts: {
    total: number;
    active: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  completion_rate_pct: number;
  last_enrolled_at: string | null;
  last_completed_at: string | null;
  median_progress_pct: number;
  certificates_issued: number;
  enrollment_trend_30d: Array<{date: string; count: number}>;
  /** Invitation-side KPIs. The block is always present (zeros when the
   *  course never used invitations) so the frontend can switch on
   *  ``invite_counts.total > 0`` rather than checking field
   *  presence. Only surfaces in the UI when the course is in
   *  invite-only mode. */
  invite_counts: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    revoked: number;
    expired: number;
  };
  invite_acceptance_rate_pct: number;
  invite_median_decision_hours: number;
  invite_trend_30d: Array<{date: string; count: number}>;
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

  /** Aggregated instructor-side analytics for one course. Backend
   *  returns a single envelope so the frontend doesn't aggregate. */
  courseAnalytics(courseId: number): Observable<CourseAnalyticsDto> {
    return this.http.get<CourseAnalyticsDto>(`${this.baseUrl}/course/${courseId}/analytics/`);
  }

  myCertificates(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/certificate/`);
  }

  certificate(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/certificate/${id}/`);
  }

  /** Read the caller's private note for a lesson. Returns a fresh
   *  empty row when the user hasn't taken a note yet. */
  getLessonNote(lessonId: number): Observable<{content: string}> {
    return this.http.get<{content: string}>(`${this.baseUrl}/lesson/${lessonId}/note/`);
  }

  /** Upsert the caller's note. The backend creates the row on the
   *  first PUT and overwrites it on subsequent ones. */
  saveLessonNote(lessonId: number, content: string): Observable<{content: string}> {
    return this.http.put<{content: string}>(`${this.baseUrl}/lesson/${lessonId}/note/`, {content});
  }

  verify(token: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/verify/${encodeURIComponent(token)}/`);
  }

  // ---- Course invitations -----------------------------------------------

  /** Instructor-side: send a course invitation to a domain member. */
  inviteToCourse(courseId: number, inviteeId: number): Observable<CourseInviteDto> {
    return this.http.post<CourseInviteDto>(
      `${this.baseUrl}/course/${courseId}/invite/`,
      {invitee_id: inviteeId},
    );
  }

  /** Instructor-side: send invitations to several domain members in
   *  one shot. Returns ``{processed, skipped}`` so the UI can show a
   *  partial-success toast when stale picker rows / non-members slip
   *  through. */
  bulkInviteToCourse(
    courseId: number,
    inviteeIds: number[],
  ): Observable<{processed: number; skipped: number}> {
    return this.http.post<{processed: number; skipped: number}>(
      `${this.baseUrl}/course/${courseId}/invite-bulk/`,
      {invitee_ids: inviteeIds},
    );
  }

  /** Instructor-side: list every invitation for a course (optionally
   *  narrowed to a status). */
  listInvitesForCourse(
    courseId: number,
    params: {status?: string} = {},
  ): Observable<CourseInviteDto[]> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<CourseInviteDto[]>(
      `${this.baseUrl}/course/${courseId}/invites/`,
      {params: httpParams},
    );
  }

  /** Instructor-side: re-send a pending invitation. Bumps
   *  ``last_sent_at`` and pushes the expiry forward by 14 days. */
  resendInvite(inviteId: number): Observable<CourseInviteDto> {
    return this.http.post<CourseInviteDto>(
      `${this.baseUrl}/course-invite/${inviteId}/resend/`,
      {},
    );
  }

  /** Instructor-side: revoke a pending invitation. */
  revokeInvite(inviteId: number): Observable<CourseInviteDto> {
    return this.http.post<CourseInviteDto>(
      `${this.baseUrl}/course-invite/${inviteId}/revoke/`,
      {},
    );
  }

  /** Invitee-side: every ``CourseInvite`` addressed to the calling
   *  user. Default scope is ``status=pending`` to mirror the backend
   *  default — pass ``status=all`` for the full history (accepted /
   *  declined / revoked / expired included). */
  myInvitations(params: {status?: string} = {}): Observable<CourseInviteDto[]> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<CourseInviteDto[]>(
      `${this.baseUrl}/me/invitations/`,
      {params: httpParams},
    );
  }

  /** Invitee-side: token-keyed lookup used by the acceptance page +
   *  the course-detail "Accept the invitation" button. Authenticated
   *  call; the backend gates non-invitee / non-instructor with 403. */
  getInviteByToken(token: string): Observable<CourseInviteDto> {
    return this.http.get<CourseInviteDto>(
      `${this.baseUrl}/course-invite/${encodeURIComponent(token)}/`,
    );
  }

  /** Invitee-side: accept the invitation. Creates the ACTIVE
   *  enrollment on the backend and notifies the inviter. */
  acceptInviteByToken(token: string): Observable<CourseEnrollmentDto> {
    return this.http.post<CourseEnrollmentDto>(
      `${this.baseUrl}/course-invite/${encodeURIComponent(token)}/accept/`,
      {},
    );
  }

  /** Invitee-side: decline the invitation. */
  declineInviteByToken(token: string): Observable<CourseInviteDto> {
    return this.http.post<CourseInviteDto>(
      `${this.baseUrl}/course-invite/${encodeURIComponent(token)}/decline/`,
      {},
    );
  }
}
