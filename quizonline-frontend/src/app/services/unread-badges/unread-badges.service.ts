import {DestroyRef, Injectable, computed, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subscription, interval} from 'rxjs';

import {UnreadCountsApi} from '../../api/generated/api/unread-counts.service';
import {NotificationService} from '../notification/notification.service';
import {QuizAlertService} from '../quiz-alert/quiz-alert';

/**
 * Coalesced poller for the topbar unread badges.
 *
 * Replaces the two independent 60-second polls
 * (``/api/notification/unread-count/`` + ``/api/quiz/alerts/unread-count/``)
 * with a single ``/api/unread-counts/`` round-trip per tick. The
 * response carries both numbers; we push them into the existing
 * per-service signals so every consumer (the notifications bell, the
 * topmenu alert badge, …) keeps reading from its familiar source of
 * truth without any further refactor.
 *
 * The two source services keep their ``refreshUnread()`` /
 * ``refreshUnreadCount()`` helpers for post-mutation explicit
 * refreshes (mark-as-read, send reply, …) — those still hit the
 * individual endpoints because they need the freshest possible value
 * scoped to the action just taken.
 */
const POLL_INTERVAL_MS = 60_000;

interface UnreadCountsResponse {
  notifications?: number;
  quiz_alerts?: number;
}

@Injectable({providedIn: 'root'})
export class UnreadBadgesService {
  private readonly api = inject(UnreadCountsApi);
  private readonly notif = inject(NotificationService);
  private readonly quizAlerts = inject(QuizAlertService);
  private readonly destroyRef = inject(DestroyRef);

  private pollSubscription: Subscription | null = null;

  /** Convenience aggregate — equals the sum of both badges. Components
   *  that show a single "you have things to do" pip can read this. */
  readonly totalUnread = computed(() => this.notif.unread() + this.quizAlerts.unreadCount());

  /** Start the coalesced 60 s polling. Idempotent — second+ calls
   *  return early. Pair with ``stopPolling()`` on logout. */
  startPolling(): void {
    if (this.pollSubscription) {
      return;
    }
    this.fetchOnce();
    this.pollSubscription = interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchOnce());
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.notif.setUnread(0);
    this.quizAlerts.setUnread(0);
  }

  /** One-shot refresh — useful right after a mutation that may have
   *  changed either count (e.g. mark-all-read elsewhere in the app). */
  refresh(): void {
    this.fetchOnce();
  }

  private fetchOnce(): void {
    this.api.unreadCountsRetrieve().subscribe({
      next: (raw) => {
        const response = raw as UnreadCountsResponse;
        const notif = typeof response?.notifications === 'number' ? Math.max(0, response.notifications) : 0;
        const alerts = typeof response?.quiz_alerts === 'number' ? Math.max(0, response.quiz_alerts) : 0;
        this.notif.setUnread(notif);
        this.quizAlerts.setUnread(alerts);
      },
      error: () => {
        // Silent — the badges are best-effort; the next tick retries.
      },
    });
  }
}
