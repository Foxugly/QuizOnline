import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {ProgressSpinnerModule} from 'primeng/progressspinner';

import {DomainTransferStateDto} from '../../api/generated/model/domain-transfer-state';
import {DomainService} from '../../services/domain/domain';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';
import {interp} from '../../shared/i18n/format';
import {UiTextService} from '../../shared/i18n/ui-text.service';

import {getTransferAcceptUiText} from './transfer-accept.i18n';

type ErrorKind = 'tokenInvalid' | 'tokenExpired' | 'notFound' | 'generic';

@Component({
  selector: 'app-transfer-accept',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './transfer-accept.html',
  styleUrl: './transfer-accept.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferAcceptPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly domainService = inject(DomainService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly text = inject(UiTextService).localized(getTransferAcceptUiText);

  /** Interpolated transfer explanation for the ``ready_to_accept`` state. */
  protected readyExplain(domainName: string, initiatorUsername: string): string {
    return interp(this.text().states.readyExplain, {domainName, initiatorUsername});
  }

  /** Interpolated ``wrong_account`` hint naming the intended new owner. */
  protected wrongAccount(futureOwnerUsername: string): string {
    return interp(this.text().states.wrongAccount, {futureOwnerUsername});
  }

  readonly token = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly accepting = signal<boolean>(false);
  readonly error = signal<ErrorKind | null>(null);
  readonly state = signal<DomainTransferStateDto | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set('tokenInvalid');
      this.loading.set(false);
      return;
    }
    this.token.set(token);
    this.fetchState();
  }

  accept(): void {
    if (this.accepting()) {
      return;
    }
    this.accepting.set(true);
    this.domainService.acceptTransferByToken(this.token())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.accepting.set(false)),
      )
      .subscribe({
        next: (resp) => this.state.set(resp),
        error: (err) => this.handleApiError(err),
      });
  }

  goLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: {next: `/transfer/accept/${this.token()}`},
    });
  }

  private fetchState(): void {
    this.domainService.retrieveTransferByToken(this.token())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (resp) => {
          this.state.set(resp);
          this.error.set(null);
        },
        error: (err) => this.handleApiError(err),
      });
  }

  private handleApiError(err: unknown): void {
    logApiError('transfer.accept', err);
    if (err instanceof HttpErrorResponse) {
      const detail = (err.error as {detail?: string} | null)?.detail;
      if (detail === 'token_invalid') {
        this.error.set('tokenInvalid');
        return;
      }
      if (detail === 'token_expired') {
        this.error.set('tokenExpired');
        return;
      }
      if (err.status === 404) {
        this.error.set('notFound');
        return;
      }
      if (err.status === 403 && err.error && typeof err.error === 'object' && 'state' in err.error) {
        this.state.set(err.error as DomainTransferStateDto);
        return;
      }
    }
    this.error.set('generic');
  }
}
