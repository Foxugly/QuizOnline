import {ChangeDetectionStrategy, Component, computed, inject, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';

import {DomainApi} from '../../../api/generated/api/domain.service';
import {DomainBillingDto} from '../../../api/generated/model/domain-billing';
import {PlanEnumDto} from '../../../api/generated/model/plan-enum';
import {ROUTES} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {LoadingSkeleton} from '../../../shared/components/loading-skeleton/loading-skeleton';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {interp} from '../../../shared/i18n/format';
import {getDomainSubscriptionUiText} from './domain-subscription.i18n';

type StatusKind = 'paid' | 'free-no-deadline' | 'free-active' | 'free-expired';
type StatusSeverity = 'success' | 'info' | 'warn' | 'danger';

/**
 * Read-only subscription page for a domain (owner/manager). Shows the plan,
 * the live member count, the computed monthly price and the free-period
 * deadline, plus a status callout. Backend: ``GET /api/domain/{id}/billing/``.
 * Plan + deadline are operator-managed (Django admin) — nothing is editable
 * here yet (manual invoicing; self-service payment is a later phase).
 */
@Component({
  selector: 'app-domain-subscription',
  imports: [DatePipe, RouterLink, ButtonModule, TagModule, PageHeader, LoadingSkeleton],
  templateUrl: './domain-subscription.html',
  styleUrl: './domain-subscription.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainSubscription implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly domainApi = inject(DomainApi);
  protected readonly ui = inject(UiTextService).localized(getDomainSubscriptionUiText);

  protected readonly billing = signal<DomainBillingDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  private domainId = NaN;

  protected readonly domainListLink = ROUTES.domain.list();

  protected readonly planLabel = computed(() => {
    const b = this.billing();
    if (!b) {
      return '';
    }
    return b.plan === PlanEnumDto.Paid ? this.ui().planPaid : this.ui().planFree;
  });

  protected readonly statusKind = computed<StatusKind>(() => {
    const b = this.billing();
    if (!b || b.plan === PlanEnumDto.Paid) {
      return 'paid';
    }
    if (!b.free_until) {
      return 'free-no-deadline';
    }
    return b.is_past_deadline ? 'free-expired' : 'free-active';
  });

  protected readonly statusSeverity = computed<StatusSeverity>(() => {
    switch (this.statusKind()) {
      case 'paid':
        return 'success';
      case 'free-expired':
        return 'danger';
      case 'free-active':
        return 'warn';
      default:
        return 'info';
    }
  });

  protected readonly statusMessage = computed<string>(() => {
    const b = this.billing();
    const t = this.ui();
    switch (this.statusKind()) {
      case 'paid':
        return t.statusPaid;
      case 'free-no-deadline':
        return t.statusFreeNoDeadline;
      case 'free-active':
        return interp(t.statusFreeActive, {date: this.formatDate(b?.free_until)});
      case 'free-expired':
        return interp(t.statusFreeExpired, {date: this.formatDate(b?.free_until)});
    }
  });

  ngOnInit(): void {
    this.domainId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  protected load(): void {
    if (!Number.isFinite(this.domainId) || this.domainId <= 0) {
      this.loadError.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(false);
    this.domainApi.domainBillingRetrieve({domainId: this.domainId}).subscribe({
      next: (b) => {
        this.billing.set(b);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('billing.subscription.load', err);
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  private formatDate(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    return new Date(iso).toLocaleDateString();
  }
}
