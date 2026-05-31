import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Observable, Subscription, interval, map} from 'rxjs';

import {NotificationApi} from '../../api/generated/api/notification.service';
import {NotificationReadDto} from '../../api/generated/model/notification-read';

export type NotificationStatusFilter = 'unread' | 'all' | 'deleted';

export interface NotificationListResult {
  rows: NotificationReadDto[];
  total: number;
}

const POLL_INTERVAL_MS = 60_000;

@Injectable({providedIn: 'root'})
export class NotificationService {
  private readonly api = inject(NotificationApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _unread = signal<number>(0);
  readonly unread = this._unread.asReadonly();
  readonly hasUnread = computed(() => this._unread() > 0);

  /** Cross-service setter — used by ``UnreadBadgesService`` to push
   *  the coalesced poll result into our signal. Clamped to non-negative
   *  so a corrupt payload cannot show a negative badge. */
  setUnread(count: number): void {
    const value = typeof count === 'number' && Number.isFinite(count) ? count : 0;
    this._unread.set(Math.max(0, value));
  }

  private pollSubscription: Subscription | null = null;

  /**
   * Start the 60 s polling of ``/unread-count/`` so the topbar badge
   * stays in sync without any websocket plumbing. Safe to call several
   * times — duplicate calls are no-ops.
   */
  startPolling(): void {
    if (this.pollSubscription) {
      return;
    }
    this.refreshUnread();
    this.pollSubscription = interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshUnread());
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this._unread.set(0);
  }

  /** Force-refresh the unread counter (used after mutations). */
  refreshUnread(): void {
    this.api.notificationUnreadCountRetrieve().subscribe({
      next: (res) => {
        const raw = (res as {unread?: unknown})?.unread;
        const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
        this._unread.set(Math.max(0, value));
      },
      error: () => {
        // Silent — the badge is best-effort and we already retry every 60 s.
      },
    });
  }

  list(filter: NotificationStatusFilter, page: number = 1): Observable<NotificationListResult> {
    return this.api.notificationList({status: filter, page}).pipe(
      map((res) => ({
        rows: res?.results ?? [],
        total: res?.count ?? 0,
      })),
    );
  }

  markRead(id: number): Observable<NotificationReadDto> {
    return this.api.notificationReadCreate({id: String(id)});
  }

  markAllRead(): Observable<{updated: number}> {
    return this.api.notificationReadAllCreate().pipe(
      map((res) => ({
        updated: typeof (res as {updated?: unknown})?.updated === 'number'
          ? (res as {updated: number}).updated
          : 0,
      })),
    );
  }

  delete(id: number): Observable<void> {
    return this.api.notificationDestroy({id: String(id)}).pipe(
      map(() => void 0),
    );
  }
}
