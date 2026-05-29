import {ChangeDetectionStrategy, Component, input} from '@angular/core';

/**
 * Three-column page header used by every "shell-like" page in the app
 * so the visual rhythm stays consistent: optional left slot (back
 * button, breadcrumbs, …), centered ``<h1>`` title, and optional right
 * slot (page-level actions).
 *
 * Usage:
 *
 * ```html
 * <app-page-header [title]="ui().pageTitle">
 *   <div slot="left">
 *     <p-button icon="pi pi-arrow-left" ... />
 *   </div>
 *   <div slot="right">
 *     <p-button icon="pi pi-pencil" ... />
 *   </div>
 * </app-page-header>
 * ```
 *
 * The grid columns are ``1fr auto 1fr`` so the title stays optically
 * centered even when only one side hosts content. Slots are content-
 * projected via ``[slot=left]`` / ``[slot=right]`` selectors so callers
 * can use ordinary template syntax without component wrappers.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__slot page-header__slot--left">
        <ng-content select="[slot=left]" />
      </div>
      <div class="page-header__title-row">
        <h1 class="page-header__title">{{ title() }}</h1>
        <ng-content select="[slot=title-after]" />
      </div>
      <div class="page-header__slot page-header__slot--right">
        <ng-content select="[slot=right]" />
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
    .page-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    /* Center cell wrapper so the [slot=title-after] content (a
     * status badge, a small chip) sits inline with the H1 instead of
     * stacking below it. */
    .page-header__title-row {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      justify-self: center;
      min-width: 0;
    }
    .page-header__title {
      margin: 0;
      text-align: center;
      min-width: 0;
      font-size: 1.5rem;
      line-height: 1.2;
    }
    .page-header__slot {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .page-header__slot--left  { justify-self: start; }
    .page-header__slot--right { justify-self: end; }

    @media (max-width: 640px) {
      .page-header {
        grid-template-columns: 1fr;
        row-gap: 0.6rem;
      }
      .page-header__slot--left,
      .page-header__slot--right {
        justify-self: stretch;
        justify-content: flex-start;
      }
      .page-header__slot--right { justify-content: flex-end; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  title = input.required<string>();
}
