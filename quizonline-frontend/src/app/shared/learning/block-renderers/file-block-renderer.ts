import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {UserService} from '../../../services/user/user';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickTranslation} from '../../../shared/learning/learning-translations';
import {getBlockRenderersUiText} from './block-renderers.i18n';

/**
 * Renders the ``file`` ContentBlock as a download link. The visible label
 * falls back to a localised "Download file" when no translated title was
 * supplied — keeps every visible string out of clear and through i18n.
 */
@Component({
  selector: 'app-block-file',
  template: `
    @if (block().file; as href) {
      <a [href]="href" download class="file-link">
        <i class="pi pi-download" aria-hidden="true"></i>
        <span>{{ label() }}</span>
      </a>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileBlockRenderer {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getBlockRenderersUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly label = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title')
    || this.ui().downloadFileFallback,
  );
}
