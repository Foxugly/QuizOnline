import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {catchError, distinctUntilChanged, of, switchMap} from 'rxjs';

import {DomainApi} from '../../../api/generated/api/domain.service';
import {DomainBillingDto} from '../../../api/generated/model/domain-billing';
import {PlanEnumDto} from '../../../api/generated/model/plan-enum';
import {ROUTES} from '../../../app.routes-paths';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {UserService} from '../../../services/user/user';
import {interp} from '../../../shared/i18n/format';
import {getBillingBannerUiText} from './billing-banner.i18n';

interface BannerState {
  severity: 'warn' | 'danger';
  message: string;
  link: ReturnType<typeof ROUTES.domain.subscription>;
}

const WARN_WINDOW_DAYS = 14;

/**
 * Cross-app banner nudging the owner/manager of the current domain when its
 * free-hosting deadline is near or past. The subscription endpoint is
 * owner/manager-gated, so a member's fetch simply 403s and shows nothing —
 * no client-side role check needed. Members of a blocked domain are already
 * locked out server-side; this is purely the owner's reminder.
 */
@Component({
  selector: 'app-billing-banner',
  imports: [RouterLink],
  templateUrl: './billing-banner.html',
  styleUrl: './billing-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingBanner {
  private readonly userService = inject(UserService);
  private readonly domainApi = inject(DomainApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getBillingBannerUiText);

  protected readonly state = signal<BannerState | null>(null);

  constructor() {
    const currentDomainId = computed(() => this.userService.currentUser()?.current_domain ?? null);
    toObservable(currentDomainId)
      .pipe(
        distinctUntilChanged(),
        switchMap((domainId) => {
          if (!domainId) {
            return of(null);
          }
          return this.domainApi.domainBillingRetrieve({domainId}).pipe(
            // 403 (member / not owner-manager) or any error → no banner.
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((billing) => this.state.set(this.toState(billing)));
  }

  private toState(billing: DomainBillingDto | null): BannerState | null {
    if (!billing || billing.plan !== PlanEnumDto.Free || !billing.free_until) {
      return null;
    }
    const link = ROUTES.domain.subscription(
      // current_domain is guaranteed set here (we only fetch when it is).
      this.userService.currentUser()!.current_domain!,
    );
    const date = new Date(billing.free_until).toLocaleDateString();
    if (billing.is_past_deadline) {
      return {severity: 'danger', message: interp(this.ui().expired, {date}), link};
    }
    const daysLeft = (new Date(billing.free_until).getTime() - Date.now()) / 86_400_000;
    if (daysLeft <= WARN_WINDOW_DAYS) {
      return {severity: 'warn', message: interp(this.ui().approaching, {date}), link};
    }
    return null;
  }
}
