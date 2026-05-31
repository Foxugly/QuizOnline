import {DestroyRef, Injectable, computed, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subscription, interval} from 'rxjs';

import {UnreadCountsApi} from '../../api/generated/api/unread-counts.service';
import {InvitationCountService} from '../invitation/invitation-count.service';
import {NotificationService} from '../notification/notification.service';
import {QuizAlertService} from '../quiz-alert/quiz-alert';

/**
 * Coalesced poller for the three topbar counters.
 *
 * Replaces three independent fetches
 * (``/api/notification/unread-count/`` + ``/api/quiz/alerts/unread-count/``
 * + ``/api/me/invitations/``) with a single ``/api/unread-counts/``
 * round-trip per tick. The response carries all three numbers; we
 * push them into the existing per-service signals so every consumer
 * (the notifications bell, the topmenu alert badge, the user-menu
 * invitations badge) keeps reading from its familiar source of
 * truth without any further refactor.
 *
 * The source services keep their ``refresh*()`` helpers for
 * post-mutation explicit refreshes (mark-as-read, accept invite,
 * send reply, …) — those still hit the dedicated endpoints because
 * they need the freshest possible value scoped to the action just
 * taken.
 */
const POLL_INTERVAL_MS = 60_000;

interface UnreadCountsResponse {
  notifications?: number;
  quiz_alerts?: number;
  course_invitations?: number;
}

@Injectable({providedIn: 'root'})
export class UnreadBadgesService {
  private readonly api = inject(UnreadCountsApi);
  private readonly notif = inject(NotificationService);
  private readonly quizAlerts = inject(QuizAlertService);
  private readonly invitations = inject(InvitationCountService);
  private readonly destroyRef = inject(DestroyRef);

  private pollSubscription: Subscription | null = null;

  /** Convenience aggregate — sum of the three badges. Components
   *  showing a single "you have things to do" pip can read this. */
  readonly totalUnread = computed(() =>
    this.notif.unread()
    + this.quizAlerts.unreadCount()
    + this.invitations.pendingCount(),
  );

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
    this.invitations.setPending(0);
  }

  /** One-shot refresh — useful right after a mutation that may have
   *  changed any count (e.g. mark-all-read elsewhere in the app, or
   *  accept/decline of an invitation). */
  refresh(): void {
    this.fetchOnce();
  }

  private fetchOnce(): void {
    this.api.unreadCountsRetrieve().subscribe({
      next: (raw) => {
        const response = raw as UnreadCountsResponse;
        const toInt = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0);
        this.notif.setUnread(toInt(response?.notifications));
        this.quizAlerts.setUnread(toInt(response?.quiz_alerts));
        this.invitations.setPending(toInt(response?.course_invitations));
      },
      error: () => {
        // Silent — the badges are best-effort; the next tick retries.
      },
    });
  }
}
