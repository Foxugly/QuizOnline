import {ChangeDetectionStrategy, Component, HostBinding, input} from '@angular/core';

export type StatisticVariant = 'default' | 'hero' | 'kpi';

@Component({
  selector: 'app-statistic',
  templateUrl: './statistic.html',
  styleUrl: './statistic.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly caption = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly variant = input<StatisticVariant>('default');

  @HostBinding('attr.data-variant')
  get variantAttr(): StatisticVariant {
    return this.variant();
  }
}
