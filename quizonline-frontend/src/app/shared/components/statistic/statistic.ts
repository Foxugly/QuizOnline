import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-statistic',
  templateUrl: './statistic.html',
  styleUrl: './statistic.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
