import {DatePipe} from '@angular/common';
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
import {ActivatedRoute, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {TagModule} from 'primeng/tag';

import {DomainApi as DomainApiService} from '../../api/generated/api/domain.service';
import {ActionEnumDto} from '../../api/generated/model/action-enum';
import {DomainJoinRequestDecideResponseDto} from '../../api/generated/model/domain-join-request-decide-response';
import {JoinRequestStatusEnumDto} from '../../api/generated/model/join-request-status-enum';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';

import {JoinRequestDecideUiText, getJoinRequestDecideUiText} from './join-request-decide.i18n';

type ErrorKind = 'tokenInvalid' | 'tokenExpired' | 'recipientMismatch'
  | 'cannotApproveAnymore' | 'requestNotFound' | 'generic';

@Component({
  selector: 'app-join-request-decide',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
  ],
  templateUrl: './join-request-decide.html',
  styleUrl: './join-request-decide.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRequestDecidePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly domainApi = inject(DomainApiService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly text = computed<JoinRequestDecideUiText>(
    () => getJoinRequestDecideUiText(this.userService.currentLang ?? LanguageEnumDto.Fr)
  );

  readonly token = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<ErrorKind | null>(null);
  readonly decision = signal<DomainJoinRequestDecideResponseDto | null>(null);
  readonly done = signal<ActionEnumDto | null>(null);

  /** True iff a previous decision exists and we are about to overturn it. */
  readonly isOverride = computed(() => this.decision()?.was_already_decided === true);

  readonly statusLabel = computed(() => {
    const dec = this.decision();
    if (!dec) {
      return '';
    }
    const map = this.text().status;
    switch (dec.request.status) {
      case JoinRequestStatusEnumDto.Pending:
        return map.pending;
      case JoinRequestStatusEnumDto.Approved:
        return map.approved;
      case JoinRequestStatusEnumDto.Rejected:
        return map.rejected;
      case JoinRequestStatusEnumDto.Cancelled:
        return map.cancelled;
      default:
        return dec.request.status;
    }
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.error.set('tokenInvalid');
      this.loading.set(false);
      return;
    }
    this.token.set(token);
    this.loadState();
  }

  confirm(): void {
    const token = this.token();
    if (!token || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.domainApi.domainJoinRequestDecideCreate({token})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (resp) => {
          this.decision.set(resp);
          this.done.set(resp.action);
          this.error.set(null);
        },
        error: (err) => this.handleApiError(err),
      });
  }

  private loadState(): void {
    this.loading.set(true);
    this.domainApi.domainJoinRequestDecideRetrieve({token: this.token()})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (resp) => {
          this.decision.set(resp);
          this.error.set(null);
        },
        error: (err) => this.handleApiError(err),
      });
  }

  private handleApiError(err: unknown): void {
    logApiError('join-request.decide', err);
    if (err instanceof HttpErrorResponse) {
      const detail = (err.error as {detail?: string} | null)?.detail;
      switch (detail) {
        case 'token_invalid':
          this.error.set('tokenInvalid');
          return;
        case 'token_expired':
          this.error.set('tokenExpired');
          return;
        case 'token_recipient_mismatch':
          this.error.set('recipientMismatch');
          return;
        case 'cannotApproveAnymore':
        case 'cannot_approve_anymore':
          this.error.set('cannotApproveAnymore');
          return;
      }
      if (err.status === 404) {
        this.error.set('requestNotFound');
        return;
      }
    }
    this.error.set('generic');
  }
}
