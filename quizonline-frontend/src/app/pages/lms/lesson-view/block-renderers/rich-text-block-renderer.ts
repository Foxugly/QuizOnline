import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

import {UserService} from '../../../../services/user/user';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickTranslation} from '../../../../shared/lms/lms-translations';
import {nonBreakingHyphensInHtml} from '../../../../shared/lms/non-break-hyphens';

/**
 * Renders the localized ``rich_text`` payload of a ``ContentBlock``.
 *
 * The HTML stored in ``translations.<lang>.rich_text`` is produced by the
 * backend ``bleach`` allow-list — we still funnel it through
 * ``DomSanitizer.bypassSecurityTrustHtml`` so Angular's runtime sanitizer
 * doesn't strip allowed tags (e.g. ``<a target="_blank">``).
 */
@Component({
  selector: 'app-block-rich-text',
  template: `<div class="rich-text" [innerHTML]="safeHtml()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextBlockRenderer {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly user = inject(UserService);

  readonly block = input.required<ContentBlock>();

  protected readonly safeHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      nonBreakingHyphensInHtml(
        pickTranslation(this.block().translations, this.user.lang(), 'rich_text'),
      ),
    ),
  );
}
