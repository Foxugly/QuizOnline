import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickTranslation} from '../../../shared/learning/learning-translations';
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
    @switch (block().video_provider) {
      @case ('youtube') {
        <div class="video-frame">
          <iframe [src]="embedUrl()" [title]="title()" frameborder="0" loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen></iframe>
        </div>
      }
      @case ('vimeo') {
        <div class="video-frame">
          <iframe [src]="embedUrl()" [title]="title()" frameborder="0" loading="lazy"
                  allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
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

  protected readonly embedUrl = computed<SafeResourceUrl>(() => {
    const url = this.block().video_url || '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.toEmbed(url));
  });

  /** Convert common YouTube and Vimeo watch URLs to their iframe-embed form.
   *  YouTube uses ``youtube-nocookie.com`` — same player, no third-party
   *  cookies set before play, no "Consent" interstitial in the EU. */
  private toEmbed(url: string): string {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]+)/);
    if (yt) {
      return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
    }
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) {
      return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
    }
    return url;
  }
}
