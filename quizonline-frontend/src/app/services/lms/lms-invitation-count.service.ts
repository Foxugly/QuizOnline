import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {AuthService} from '../auth/auth';
import {logApiError} from '../../shared/api/api-errors';
import {LmsEnrollmentService} from './lms-enrollment.service';

/**
 * Cached count of the calling user's pending course invitations.
 *
 * Lives in a singleton service so the topbar user-menu badge, the
 * future dashboard widget, and any other surface can subscribe to
 * one source of truth instead of fan-fetching the same endpoint
 * from each component.
 *
 * Refreshes:
 *   - Lazily on first access (the topmenu calls ``ensureLoaded``).
 *   - Explicitly via ``refresh()`` after an action that mutates the
 *     count (accept / decline / new invitation arriving via web
 *     notification).
 */
@Injectable({providedIn: 'root'})
export class LmsInvitationCountService {
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _pendingCount = signal<number>(0);
  readonly pendingCount = this._pendingCount.asReadonly();

  private loaded = false;

  /** Idempotent: the topmenu calls this on init, follow-up navigation
   *  events are no-ops once the count has loaded once. */
  ensureLoaded(): void {
    if (this.loaded) return;
    if (!this.auth.isLoggedIn()) return;
    this.loaded = true;
    this.refresh();
  }

  /** Explicit re-fetch. Use after accept / decline / revoke flows or
   *  when a ``course_invite.received`` notification lands. */
  refresh(): void {
    if (!this.auth.isLoggedIn()) {
      this._pendingCount.set(0);
      return;
    }
    this.enrollment
      .myInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this._pendingCount.set(rows.length),
        error: (err: unknown) => {
          // A failed count is non-blocking — keep the previous value
          // (or zero) so the topmenu badge doesn't lie.
          logApiError('lms.invitation-count.refresh', err);
        },
      });
  }
}
