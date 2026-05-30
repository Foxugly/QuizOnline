import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../i18n/ui-text.service';
import {ContentBlock} from '../content-block.types';
import {pickTranslation} from '../learning-translations';
import {UserService} from '../../../services/user/user';
import {getBlockRenderersUiText} from './block-renderers.i18n';

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
    @if (block().external_url; as url) {
      <div class="embed-frame">
        <iframe [src]="safeUrl()" [title]="title()" frameborder="0" loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen></iframe>
      </div>
      <a class="embed-open" [href]="url" target="_blank" rel="noopener noreferrer">
        <i class="pi pi-external-link" aria-hidden="true"></i>
        {{ ui().embedOpenInNewTab }}
      </a>
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
    /* Escape-hatch link sitting under the iframe. Surfaces an explicit
     * way out when the host site (YouTube, Vimeo, ...) refuses to play
     * its own content inside an iframe — we can't detect cross-origin
     * playback failure from script, so we always show the link. */
    .embed-open {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.4rem;
      font-size: 0.85rem;
      color: var(--p-text-color-secondary, #6b7280);
      text-decoration: none;
    }
    .embed-open:hover,
    .embed-open:focus-visible {
      color: var(--p-primary-color, #3b82f6);
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbedBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getBlockRenderersUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly title = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title') || 'Embed',
  );

  protected readonly safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(rewriteYoutubeEmbedUrl(this.block().external_url)),
  );
}

/** When the author pasted a ``youtube.com/embed/<id>`` URL directly,
 *  add ``rel=0`` so YouTube doesn't tail the embed with a grid of
 *  unrelated recommendations (often competing videos). Returns the
 *  URL unchanged for any non-YouTube-embed host (Vimeo, CodePen,
 *  Figma, ...) and when the param is already present. */
function rewriteYoutubeEmbedUrl(url: string): string {
  if (!/youtube\.com\/embed\//i.test(url)) {
    return url;
  }
  if (/[?&]rel=/.test(url)) {
    return url;
  }
  return url + (url.includes('?') ? '&' : '?') + 'rel=0';
}
