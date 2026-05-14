import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UiTextService} from '../../i18n/ui-text.service';
import {getSavedAtUiText} from './saved-at.i18n';

/**
 * Small "Enregistré à HH:MM" badge rendered next to the Save button on
 * long edit forms so the user gets immediate feedback that their last
 * save succeeded — even after they have already started editing the
 * next field. Stays empty until ``at`` is set, so the badge does not
 * leak the page's initial load timestamp.
 */
@Component({
  selector: 'app-saved-at',
  templateUrl: './saved-at.html',
  styleUrl: './saved-at.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedAtComponent {
  readonly at = input<Date | null | undefined>(null);

  private readonly pageText = inject(UiTextService).localized(getSavedAtUiText);

  readonly label = computed(() => {
    const at = this.at();
    if (!at) return null;
    const t = this.pageText();
    const time = new Intl.DateTimeFormat(t.locale, {hour: '2-digit', minute: '2-digit'}).format(at);
    return t.savedAtLabel(time);
  });
}
