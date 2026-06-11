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
import {switchMap} from 'rxjs';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {ProgressSpinnerModule} from 'primeng/progressspinner';

import {AuthApi as AuthApiService} from '../../../api/generated/api/auth.service';
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
  private readonly authApi = inject(AuthApiService);
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

    // switchMap composes the token-exchange and the loginWithTokens()/getMe()
    // into a single stream guarded by one takeUntilDestroyed, so a destroy
    // mid-exchange cancels the inner getMe() too — no stray navigation or
    // leaked subscription after the component is gone.
    this.authApi.authMagicLinkExchangeCreate({
      magicLinkExchangeRequestRequestDto: {token},
    } as never)
      .pipe(
        switchMap((pair: {access: string; refresh: string}) =>
          // Persist tokens + populate /me through the shared helper that
          // the password-login path uses; the auth state is now indis-
          // tinguishable from a regular sign-in.
          this.auth.loginWithTokens(pair.access, pair.refresh),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.working.set(false);
          // Fire-and-forget connection-log capture on real success only.
          this.connectionLog.record('magic_link');
          const nextUrl = this.route.snapshot.queryParamMap.get('next');
          const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.includes('://') ? nextUrl : null;
          void this.router.navigateByUrl(safeNext || '/home');
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
