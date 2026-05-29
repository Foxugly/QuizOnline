import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {SkeletonModule} from 'primeng/skeleton';

/**
 * Generic page-loading skeleton used in place of a bare "Loading…"
 * text on detail pages while the upstream fetch resolves. The shape
 * (title + meta line + a few content rows) covers the typical layout
 * of every learner-facing detail page (lesson-view, course-detail,
 * certificate-view, …) closely enough that the layout shift on real-
 * content render is minimal.
 *
 * For grid-shaped pages (catalog, course-list) prefer an inline
 * skeleton card grid — a one-size-fits-all skeleton would lie about
 * the upcoming layout.
 *
 * Optional ``rows`` lets a caller tune the number of content lines
 * (defaults to 3, matches a typical lesson body).
 */
@Component({
  selector: 'app-loading-skeleton',
  imports: [SkeletonModule],
  template: `
    <div class="loading-skeleton" role="status" aria-busy="true">
      <p-skeleton width="60%" height="2rem" styleClass="loading-skeleton__title" />
      <p-skeleton width="35%" height="0.9rem" styleClass="loading-skeleton__meta" />
      @for (i of rowsArray(); track $index) {
        <p-skeleton width="100%" height="6rem" styleClass="loading-skeleton__row" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      padding: 0.5rem 0;
    }
    :host ::ng-deep .loading-skeleton__title { margin-bottom: 0.4rem; }
    :host ::ng-deep .loading-skeleton__meta { margin-bottom: 1rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeleton {
  rows = input<number>(3);
  protected rowsArray(): readonly unknown[] {
    return Array.from({length: Math.max(1, this.rows())});
  }
}
