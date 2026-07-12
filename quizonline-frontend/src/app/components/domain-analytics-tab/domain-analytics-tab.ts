import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TableModule} from 'primeng/table';

import {DomainAnalyticsDto} from '../../api/generated/model/domain-analytics';
import {AnalyticsRange} from '../../services/domain/domain-edit-api';
import {DomainEditUiText} from '../../pages/domain/edit/domain-edit.i18n';
import {plural} from '../../shared/i18n/format';
import {formatDomainEditDuration} from '../../pages/domain/edit/domain-edit-duration.util';

@Component({
  selector: 'app-domain-analytics-tab',
  imports: [
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    SelectButtonModule,
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
  readonly range = input<AnalyticsRange>('all');
  readonly exporting = input<boolean>(false);

  readonly rangeChange = output<AnalyticsRange>();
  readonly exportCsv = output<void>();

  protected readonly labels = computed(() => this.text().analytics);

  protected readonly rangeOptions = computed<Array<{label: string; value: AnalyticsRange}>>(() => {
    const l = this.labels();
    return [
      {label: l.range7d, value: '7d'},
      {label: l.range30d, value: '30d'},
      {label: l.range90d, value: '90d'},
      {label: l.rangeAll, value: 'all'},
    ];
  });

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
    return formatDomainEditDuration(a.median_decision_seconds, this.labels().durationFormat);
  });

  protected decisionsLabelText(n: number): string {
    return plural(this.labels().decisionsLabel, n);
  }

  protected onRangeChange(value: AnalyticsRange | null | undefined): void {
    if (value && value !== this.range()) {
      this.rangeChange.emit(value);
    }
  }
}
