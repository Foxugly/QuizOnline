import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';

export type BulkActionOption = {
  label: string;
  value: string;
  icon?: string;
  danger?: boolean;
};

/**
 * Reusable dropdown + Apply button + selected-count strip used above
 * list tables. The host is responsible for owning the selection state
 * (rows checked) and for performing the action when (apply) fires.
 *
 *   <app-bulk-actions
 *     [options]="bulkActionOptions()"
 *     [placeholder]="t.bulkPlaceholder"
 *     [applyLabel]="t.bulkApply"
 *     [count]="selectedCount()"
 *     [countText]="t.bulkSelectedCount(selectedCount())"
 *     [applying]="applying()"
 *     (apply)="applyBulk($event)"
 *   ></app-bulk-actions>
 */
@Component({
  selector: 'app-bulk-actions',
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './bulk-actions.html',
  styleUrl: './bulk-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkActionsComponent {
  readonly options = input.required<BulkActionOption[]>();
  readonly placeholder = input<string>('');
  readonly applyLabel = input<string>('Apply');
  readonly count = input<number>(0);
  readonly countText = input<string>('');
  readonly applying = input<boolean>(false);

  readonly apply = output<string>();

  readonly selected = signal<string | null>(null);

  readonly canApply = computed(() =>
    this.selected() !== null && this.count() > 0 && !this.applying(),
  );

  onApply(): void {
    const value = this.selected();
    if (value !== null && this.canApply()) {
      this.apply.emit(value);
    }
  }
}
