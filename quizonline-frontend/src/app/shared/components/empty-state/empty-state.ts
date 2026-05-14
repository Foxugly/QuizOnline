import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {ButtonModule} from 'primeng/button';

/**
 * Reusable empty-state block for "no rows yet" lists, paginated tables,
 * dropdowns and dialogs. Renders a faded icon + title + optional hint
 * + optional call-to-action button, all centred. Sizes adapt to the
 * surrounding container.
 *
 * Default ``icon`` is ``pi pi-inbox`` — override for context-specific
 * imagery (e.g. ``pi pi-users`` for a members list, ``pi pi-history``
 * for an audit log).
 */
@Component({
  selector: 'app-empty-state',
  imports: [ButtonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input<string>('pi pi-inbox');
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly cta = input<string | null>(null);
  /** Visual density — ``compact`` for dropdowns / cells, ``default``
   *  for full pages. */
  readonly density = input<'compact' | 'default'>('default');

  readonly ctaClick = output<void>();
}
