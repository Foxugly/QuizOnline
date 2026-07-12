import {DestroyRef, Injectable, signal, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpClient} from '@angular/common/http';
import {interval, map, Observable, Subscription, tap} from 'rxjs';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/** Polling cadence for the topbar unread badge. Matches the
 *  ``NotificationService`` so both badges refresh together — and in a
 *  later step the two endpoints can be fused into a single call. */
const POLL_INTERVAL_MS = 60_000;

export interface AlertUserSummary {
  id: number;
  name: string;
}

export interface QuizAlertMessageDto {
  id: number;
  author: number;
  author_summary: AlertUserSummary | null;
  body: string;
  created_at: string;
  is_mine: boolean;
  is_unread: boolean;
}

export interface QuizAlertThreadListDto {
  id: number;
  quiz: number;
  kind: 'question' | 'assignment';
  question_id: number | null;
  question_order: number | null;
  question_title: string;
  quiz_template_title: string;
  reported_language: string;
  status: 'open' | 'closed';
  reporter_reply_allowed: boolean;
  last_message_at: string;
  created_at: string;
  unread: boolean;
  unread_count: number;
  last_message_preview: string;
  counterpart_name: string;
}

export interface QuizAlertThreadDetailDto extends QuizAlertThreadListDto {
  reporter: number;
  reporter_summary: AlertUserSummary | null;
  owner: number;
  owner_summary: AlertUserSummary | null;
  closed_at: string | null;
  closed_by: number | null;
  messages: QuizAlertMessageDto[];
  can_reply: boolean;
  can_manage: boolean;
}

export interface QuizAlertCreatePayload {
  quiz_id: number;
  question_id: number;
  body: string;
}

@Injectable({providedIn: 'root'})
export class QuizAlertService {
  readonly unreadCount = signal(0);
  private readonly baseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/quiz/alerts`;

    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);
    private pollSubscription: Subscription | null = null;

  /**
   * Start a 60 s polling of ``/quiz/alerts/unread-count/`` so the topbar
   * badge stays in sync. Idempotent — second+ calls return early. Pair
   * with ``stopPolling()`` on logout. Same shape as ``NotificationService``.
   */
  startPolling(): void {
    if (this.pollSubscription) {
      return;
    }
    this.refreshUnreadCount().subscribe({error: () => this.clearUnreadCount()});
    this.pollSubscription = interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshUnreadCount().subscribe({error: () => this.clearUnreadCount()});
      });
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.clearUnreadCount();
  }

  list(): Observable<QuizAlertThreadListDto[]> {
    return this.http
      .get<QuizAlertThreadListDto[] | {results?: QuizAlertThreadListDto[]}>(`${this.baseUrl}/`)
      .pipe(map((response) => Array.isArray(response) ? response : (response.results ?? [])));
  }

  retrieve(alertId: number): Observable<QuizAlertThreadDetailDto> {
    return this.http.get<QuizAlertThreadDetailDto>(`${this.baseUrl}/${alertId}/`);
  }

  create(payload: QuizAlertCreatePayload): Observable<QuizAlertThreadDetailDto> {
    return this.http.post<QuizAlertThreadDetailDto>(`${this.baseUrl}/`, payload);
  }

  postMessage(alertId: number, body: string): Observable<QuizAlertMessageDto> {
    return this.http.post<QuizAlertMessageDto>(`${this.baseUrl}/${alertId}/message/`, {body});
  }

  update(alertId: number, payload: {reporter_reply_allowed: boolean}): Observable<QuizAlertThreadDetailDto> {
    return this.http.patch<QuizAlertThreadDetailDto>(`${this.baseUrl}/${alertId}/`, payload);
  }

  close(alertId: number): Observable<QuizAlertThreadDetailDto> {
    return this.http.post<QuizAlertThreadDetailDto>(`${this.baseUrl}/${alertId}/close/`, {});
  }

  reopen(alertId: number): Observable<QuizAlertThreadDetailDto> {
    return this.http.post<QuizAlertThreadDetailDto>(`${this.baseUrl}/${alertId}/reopen/`, {});
  }

  refreshUnreadCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/unread-count/`).pipe(
      tap((response) => this.unreadCount.set(response.count ?? 0)),
    );
  }

  /** Cross-service setter — used by ``UnreadBadgesService`` to push
   *  the coalesced poll result into our signal. */
  setUnread(count: number): void {
    const value = typeof count === 'number' && Number.isFinite(count) ? count : 0;
    this.unreadCount.set(Math.max(0, value));
  }

  clearUnreadCount(): void {
    this.unreadCount.set(0);
  }
}
