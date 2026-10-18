import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {ProgressSpinnerModule} from 'primeng/progressspinner';

import {AuthService} from '../../../services/auth/auth';
import {ConnectionLogService} from '../../../services/connection-log/connection-log.service';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';

type ErrorKind = 'expired' | 'invalid';

@Component({
  selector: 'app-magic-link-exchange',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './magic-link-exchange.html',
  styleUrl: './magic-link-exchange.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MagicLinkExchangePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly connectionLog = inject(ConnectionLogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ui = inject(UiTextService).ui;
  readonly working = signal(true);
  readonly error = signal<ErrorKind | null>(null);

  readonly status = computed(() => {
    if (this.working()) {
      return 'working';
    }
    return this.error() ?? 'done';
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set('invalid');
      this.working.set(false);
      return;
    }

    // One stream (exchange -> /me) guarded by one takeUntilDestroyed, so a
    // destroy mid-exchange cancels the inner getMe() too. The refresh token
    // lands in the HttpOnly cookie; the access token stays in memory.
    this.auth.exchangeMagicLink(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.working.set(false);
          // Fire-and-forget connection-log capture on real success only.
          this.connectionLog.record('magic_link');
          const nextUrl = this.route.snapshot.queryParamMap.get('next');
          const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.includes('://') ? nextUrl : null;
          // replaceUrl: the token URL leaves the history (audit M13).
          void this.router.navigateByUrl(safeNext || '/home', {replaceUrl: true});
        },
        error: (err) => {
          logApiError('auth.magic-link.exchange', err);
          this.working.set(false);
          // Only the token-exchange returns 410 (expired); a getMe() failure
          // falls through to the generic 'invalid' state, matching the prior
          // per-stage handling.
          if (err instanceof HttpErrorResponse && err.status === 410) {
            this.error.set('expired');
            return;
          }
          this.error.set('invalid');
        },
      });
  }
}
