import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickTranslation} from '../../../shared/learning/learning-translations';
import {toYoutubeEmbedUrl} from '../../../shared/media/youtube';
import {UserService} from '../../../services/user/user';
import {getLessonViewUiText} from '../lesson-view.i18n';

/**
 * Renders the ``video`` ContentBlock, handling the three video providers
 * the backend currently accepts:
 *
 * * ``youtube`` — convert the canonical watch URL to ``/embed/<id>`` on
 *   the privacy-enhanced ``youtube-nocookie.com`` domain so no cookies
 *   land before the user actually presses play.
 * * ``vimeo``   — convert ``vimeo.com/<id>`` to ``player.vimeo.com/video/<id>``.
 * * ``upload``  — served from S3 / nginx as a raw ``<video>`` source.
 *
 * Both iframe variants pipe the URL through ``DomSanitizer`` so Angular
 * stops complaining about untrusted resource URLs. ``loading="lazy"``
 * defers the embed until the card scrolls near the viewport — important
 * on long lessons with multiple videos that would otherwise all
 * connect on first render. ``preload="metadata"`` on uploaded videos
 * fetches just the duration / dimensions, not the full bytes.
 *
 * The container enforces a 16:9 aspect ratio so the iframe sizes
 * proportionally and never overflows the card. The fallback paragraph
 * is localised so it never leaks an untranslated English label.
 */
@Component({
  selector: 'app-block-video',
  template: `
    @switch (effectiveProvider()) {
      @case ('youtube') {
        <div class="video-frame">
          <iframe [src]="embedUrl()" [title]="title()" frameborder="0" loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen></iframe>
        </div>
        @if (block().video_url; as url) {
          <a class="video-open" [href]="url" target="_blank" rel="noopener noreferrer">
            <i class="pi pi-external-link" aria-hidden="true"></i>
            {{ ui().embedOpenInNewTab }}
          </a>
        }
      }
      @case ('vimeo') {
        <div class="video-frame">
          <iframe [src]="embedUrl()" [title]="title()" frameborder="0" loading="lazy"
                  allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
        @if (block().video_url; as url) {
          <a class="video-open" [href]="url" target="_blank" rel="noopener noreferrer">
            <i class="pi pi-external-link" aria-hidden="true"></i>
            {{ ui().embedOpenInNewTab }}
          </a>
        }
      }
      @case ('upload') {
        <video controls preload="metadata" [src]="block().video_url"
               [attr.aria-label]="title()" class="video-upload"></video>
      }
      @default {
        <p class="muted">{{ ui().videoNotAvailable }}</p>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .video-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 6px;
      overflow: hidden;
    }
    .video-frame iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .video-upload {
      width: 100%;
      max-height: 70vh;
      display: block;
      background: #000;
      border-radius: 6px;
    }
    /* Escape-hatch link sitting under the iframe (symmetric to the
     * iframe block's .embed-open). Surfaces an explicit way out
     * when the embedded host refuses to play its own content inside
     * the iframe (YouTube Error 153 on copyright-locked videos,
     * Vimeo private videos, ...). */
    .video-open {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.4rem;
      font-size: 0.85rem;
      color: var(--p-text-color-secondary, #6b7280);
      text-decoration: none;
    }
    .video-open:hover,
    .video-open:focus-visible {
      color: var(--p-primary-color, #3b82f6);
      text-decoration: underline;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getLessonViewUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly title = computed(() =>
    pickTranslation(this.block().translations, this.user.lang(), 'title') || 'Video',
  );

  /** The provider to render with. Falls back to host-based auto-detection
   *  on the ``video_url`` when the block has no explicit ``video_provider``
   *  set — older blocks (or ones whose provider was wiped) still embed
   *  correctly instead of falling through to the "video unavailable"
   *  placeholder. */
  protected readonly effectiveProvider = computed<string>(() => {
    const explicit = (this.block().video_provider || '').toLowerCase();
    if (explicit) {
      return explicit;
    }
    const url = (this.block().video_url || '').toLowerCase();
    if (/(?:youtube\.com|youtu\.be)/i.test(url)) {
      return 'youtube';
    }
    if (/vimeo\.com/i.test(url)) {
      return 'vimeo';
    }
    return '';
  });

  protected readonly embedUrl = computed<SafeResourceUrl>(() => {
    const url = this.block().video_url || '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.toEmbed(url));
  });

  /** Convert common YouTube and Vimeo watch URLs to their iframe-embed
   *  form. Delegates YouTube parsing to the shared ``toYoutubeEmbedUrl``
   *  helper (URL-based — handles ``youtu.be`` / ``watch?v=`` / ``embed``
   *  / ``shorts`` / ``live`` / ``v/`` plus the ``?si=`` share param)
   *  rather than a local regex that misses edge cases. The shared
   *  helper already pins us to ``youtube.com/embed`` (not nocookie)
   *  because the nocookie host surfaces "Vidéo non disponible" on
   *  perfectly public videos. */
  private toEmbed(url: string): string {
    const yt = toYoutubeEmbedUrl(url);
    if (yt) {
      return `${yt}?rel=0`;
    }
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) {
      return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
    }
    return url;
  }
}
