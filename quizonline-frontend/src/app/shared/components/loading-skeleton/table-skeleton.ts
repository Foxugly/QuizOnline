import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {SkeletonModule} from 'primeng/skeleton';

@Component({
  selector: 'app-table-skeleton',
  imports: [SkeletonModule],
  template: `
    <div class="table-skeleton" role="status" aria-busy="true">
      <table class="table-skeleton__table">
        <thead>
          <tr>
            @for (col of cols(); track $index) {
              <th><p-skeleton width="60%" height="0.9rem" /></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rowsArr(); track $index) {
            <tr>
              @for (col of cols(); track $index) {
                <td><p-skeleton width="80%" height="1.1rem" /></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .table-skeleton__table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .table-skeleton__table th,
    .table-skeleton__table td {
      padding: 0.7rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--p-content-border-color, rgba(0, 0, 0, 0.08));
    }
    .table-skeleton__table th { background: var(--p-datatable-header-cell-background, transparent); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSkeleton {
  rows = input<number>(5);
  columns = input<number>(4);
  protected readonly rowsArr = computed(() =>
    Array.from({length: Math.max(1, this.rows())}),
  );
  protected readonly cols = computed(() =>
    Array.from({length: Math.max(1, this.columns())}),
  );
}
