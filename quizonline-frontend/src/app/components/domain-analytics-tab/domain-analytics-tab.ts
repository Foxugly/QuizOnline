import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {TableModule} from 'primeng/table';

import {DomainAnalyticsDto} from '../../api/generated/model/domain-analytics';
import {DomainEditUiText} from '../../pages/domain/edit/domain-edit.i18n';

@Component({
  selector: 'app-domain-analytics-tab',
  imports: [
    ProgressSpinnerModule,
    TableModule,
  ],
  templateUrl: './domain-analytics-tab.html',
  styleUrl: './domain-analytics-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainAnalyticsTab {
  readonly analytics = input<DomainAnalyticsDto | null>(null);
  readonly loading = input<boolean>(false);
  readonly text = input.required<DomainEditUiText>();

  protected readonly labels = computed(() => this.text().analytics);

  protected readonly acceptRateDisplay = computed(() => {
    const a = this.analytics();
    if (!a || a.accept_rate_pct === null || a.accept_rate_pct === undefined) {
      return this.labels().acceptRateUnknown;
    }
    return `${Math.round(a.accept_rate_pct)} %`;
  });

  protected readonly medianDecisionDisplay = computed(() => {
    const a = this.analytics();
    if (!a || a.median_decision_seconds === null || a.median_decision_seconds === undefined) {
      return this.labels().medianDecisionUnknown;
    }
    return this.labels().durationFormat(a.median_decision_seconds);
  });
}
