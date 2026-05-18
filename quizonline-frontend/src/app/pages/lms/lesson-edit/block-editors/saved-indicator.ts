import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Tiny "Saved at HH:MM" indicator rendered inline in each block
 * editor's tablist. Receives a ``savedAt`` timestamp from the shell
 * after every successful PATCH and turns it into a localized hint
 * with a check icon. Returns nothing when the editor has not yet been
 * saved (avoids dangling "Saved at —" labels on fresh blocks).
 */
@Component({
  selector: 'app-saved-indicator',
  template: `
    @if (savedAt(); as ts) {
      <span class="saved-indicator" [attr.title]="ts.toLocaleString()">
        <i class="pi pi-check-circle saved-indicator__icon" aria-hidden="true"></i>
        {{ ui().savedAt(formatTime(ts)) }}
      </span>
    }
  `,
  styles: [`
    .saved-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary, #6b7280);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .saved-indicator__icon {
      color: var(--p-green-500, #22c55e);
      font-size: 0.85rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedIndicator {
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  savedAt = input<Date | null>(null);

  protected formatTime(ts: Date): string {
    return ts.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  }
}
