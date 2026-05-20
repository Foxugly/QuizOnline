import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UserService} from '../../../services/user/user';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickTranslation} from '../../../shared/learning/learning-translations';

/**
 * Renders the ``callout`` ContentBlock — an aside with optional bold
 * title and a body paragraph. Both fields are translated, so the active
 * UI language determines which payload is shown (with the usual fr/en
 * fallback chain in :func:`pickTranslation`).
 */
@Component({
  selector: 'app-block-callout',
  template: `
    <aside class="callout">
      @if (title(); as t) {
        <strong>{{ t }}</strong>
      }
      <p>{{ body() }}</p>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalloutBlockRenderer {
  private readonly user = inject(UserService);

  readonly block = input.required<ContentBlock>();

  protected readonly title = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title'),
  );

  protected readonly body = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'callout_text'),
  );
}
