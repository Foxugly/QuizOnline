import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {getLmsLessonViewUiText} from '../lesson-view.i18n';

/**
 * Renders the ``embed`` ContentBlock — an arbitrary external URL hosted
 * in an iframe (CodePen, Figma, Loom, …). The backend already validates
 * the URL is HTTPS and not on a denylist; we just pipe it through
 * ``DomSanitizer.bypassSecurityTrustResourceUrl`` so Angular renders it.
 */
@Component({
  selector: 'app-block-embed',
  template: `
    @if (block().external_url) {
      <iframe [src]="safeUrl()" frameborder="0"></iframe>
    } @else {
      <p class="muted">{{ ui().embedNotAvailable }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbedBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly ui = inject(UiTextService).localized(getLmsLessonViewUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.block().external_url),
  );
}
