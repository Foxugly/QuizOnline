import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickTranslation} from '../../../../shared/lms/lms-translations';
import {UserService} from '../../../../services/user/user';
import {getLmsLessonViewUiText} from '../lesson-view.i18n';

/**
 * Renders the ``embed`` ContentBlock — an arbitrary external URL hosted
 * in an iframe (CodePen, Figma, Loom, …). The backend already validates
 * the URL is HTTPS and not on a denylist; we just pipe it through
 * ``DomSanitizer.bypassSecurityTrustResourceUrl`` so Angular renders it.
 *
 * ``loading="lazy"`` defers the embed until the card scrolls near the
 * viewport — vital on lessons with several embeds, which would
 * otherwise all connect to third-party origins on first render.
 * The 16:9 wrapper keeps the iframe proportional inside the card.
 */
@Component({
  selector: 'app-block-embed',
  template: `
    @if (block().external_url) {
      <div class="embed-frame">
        <iframe [src]="safeUrl()" [title]="title()" frameborder="0" loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen></iframe>
      </div>
    } @else {
      <p class="muted">{{ ui().embedNotAvailable }}</p>
    }
  `,
  styles: [`
    :host { display: block; }
    .embed-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--p-surface-100, #f3f4f6);
      border-radius: 6px;
      overflow: hidden;
    }
    .embed-frame iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbedBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getLmsLessonViewUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly title = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title') || 'Embed',
  );

  protected readonly safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.block().external_url),
  );
}
