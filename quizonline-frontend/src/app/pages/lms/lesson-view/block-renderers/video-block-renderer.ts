import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {getLmsLessonViewUiText} from '../lesson-view.i18n';

/**
 * Renders the ``video`` ContentBlock, handling the three video providers
 * the backend currently accepts:
 *
 * * ``youtube`` — convert the canonical watch URL to ``/embed/<id>``.
 * * ``vimeo``   — convert ``vimeo.com/<id>`` to ``player.vimeo.com/video/<id>``.
 * * ``upload``  — served from S3 / nginx as a raw ``<video>`` source.
 *
 * Both iframe variants pipe the URL through ``DomSanitizer`` so Angular
 * stops complaining about untrusted resource URLs. The fallback paragraph
 * is localised so it never leaks an untranslated English label.
 */
@Component({
  selector: 'app-block-video',
  template: `
    @switch (block().video_provider) {
      @case ('youtube') {
        <iframe [src]="embedUrl()" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>
      }
      @case ('vimeo') {
        <iframe [src]="embedUrl()" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
      }
      @case ('upload') {
        <video controls [src]="block().video_url"></video>
      }
      @default {
        <p class="muted">{{ ui().videoNotAvailable }}</p>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly ui = inject(UiTextService).localized(getLmsLessonViewUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly embedUrl = computed<SafeResourceUrl>(() => {
    const url = this.block().video_url || '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.toEmbed(url));
  });

  /** Convert common YouTube and Vimeo watch URLs to their iframe-embed form. */
  private toEmbed(url: string): string {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    if (yt) {
      return `https://www.youtube.com/embed/${yt[1]}`;
    }
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) {
      return `https://player.vimeo.com/video/${vm[1]}`;
    }
    return url;
  }
}
