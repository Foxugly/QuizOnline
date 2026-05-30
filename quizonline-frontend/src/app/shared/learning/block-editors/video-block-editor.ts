import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {SelectButtonModule} from 'primeng/selectbutton';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';

import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickDefaultLang} from '../../../shared/learning/default-lang';
import {VideoProvider, getLearningCommonUiText} from '../../../shared/learning/learning-common.i18n';
import {isYoutubeUrl, toYoutubeEmbedUrl} from '../../../shared/media/youtube';

import {getBlockListEditorUiText} from '../../../shared/learning/block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``video`` ContentBlock.
 *
 * Translatable: a per-language ``title`` (caption / aria-label).
 * Non-translatable: the canonical ``video_url`` and the
 * ``video_provider`` (``youtube`` / ``vimeo`` / ``upload``).
 */
@Component({
  selector: 'app-video-block-editor',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectButtonModule, TabsModule, BlockTranslateButton],
  template: `
    @if (!hideTitle()) {
      <p-tabs [value]="activeLang()" (valueChange)="activeLang.set($any($event))">
        <p-tablist>
          @for (lang of availableLangs(); track lang) {
            <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
          }
          <div class="tablist-actions">
            <app-block-translate-button
              [block]="currentBlock()"
              [availableLangs]="availableLangs()"
              [activeLang]="activeLang()"
              (changed)="applyTranslationPatch($event)" />
          </div>
        </p-tablist>
        <p-tabpanels>
          @for (lang of availableLangs(); track lang) {
            <p-tabpanel [value]="lang">
              <label class="field">
                {{ ui().fieldTitle }}
                <input pInputText type="text"
                       [ngModel]="titleFor(lang)"
                       (ngModelChange)="onTitleChange(lang, $event)" />
              </label>
            </p-tabpanel>
          }
        </p-tabpanels>
      </p-tabs>
    }

    <label class="field">
      {{ ui().fieldVideoUrl }}
      <input pInputText type="url" placeholder="https://www.youtube.com/watch?v=…"
             [ngModel]="currentBlock().video_url"
             (ngModelChange)="onUrlChange($event)" />
    </label>

    <div class="field">
      <span>{{ ui().fieldVideoProvider }}</span>
      <p-selectButton [options]="providerOptions()"
                      [ngModel]="currentBlock().video_provider || null"
                      optionLabel="label"
                      optionValue="value"
                      [allowEmpty]="false"
                      (ngModelChange)="onProviderChange($event)" />
    </div>

    @if (previewUrl(); as preview) {
      <div class="preview">
        <iframe [src]="preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
                [title]="ui().fieldVideoUrl"></iframe>
      </div>
    }

    <div class="block-editor-footer">
      <p-button type="button" severity="secondary" [outlined]="true"
                [label]="listUi().cancelBlockLabel"
                [disabled]="saving()"
                (onClick)="cancel.emit()" />
      <p-button type="button"
                [label]="listUi().saveBlockLabel"
                [loading]="saving()"
                [disabled]="saving()"
                (onClick)="save.emit(currentBlock())" />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; margin-top: 0.65rem; }
    .preview { margin-top: 0.75rem; border: 1px solid var(--p-surface-border, #e5e7eb); border-radius: 10px; overflow: hidden; aspect-ratio: 16 / 9; max-width: 540px; }
    .preview iframe { width: 100%; height: 100%; border: 0; display: block; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoBlockEditor implements OnInit {
  private readonly user = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly common = inject(UiTextService).localized(getLearningCommonUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  /** Hide the per-language title input (and its language tab strip,
   *  since the title is the only translatable field on this block). */
  readonly hideTitle = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  private readonly localBlock = signal<ContentBlock | null>(null);
  protected readonly currentBlock = computed(() => this.localBlock() ?? this.block());

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  protected readonly providerOptions = computed(() => {
    const labels = this.common().videoProviderLabels;
    return (['youtube', 'vimeo', 'upload'] satisfies VideoProvider[]).map((value) => ({
      value,
      label: labels[value],
    }));
  });

  /** Sanitized embed URL for the live preview. Returns ``null`` when no
   *  recognisable YouTube / Vimeo id can be extracted from the current
   *  ``video_url`` (or when the provider is ``upload``). */
  protected readonly previewUrl = computed<SafeResourceUrl | null>(() => {
    const block = this.currentBlock();
    const url = (block.video_url ?? '').trim();
    if (!url) {
      return null;
    }
    const provider = block.video_provider || detectProvider(url);
    let embed: string | null = null;
    if (provider === 'youtube') {
      embed = toYoutubeEmbedUrl(url);
    } else if (provider === 'vimeo') {
      const id = extractVimeoId(url);
      embed = id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
  }

  protected titleFor(lang: string): string {
    return this.currentBlock().translations?.[lang]?.['title'] ?? '';
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const current = this.currentBlock();
    const tr = {...(current.translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.localBlock.set({...current, translations: tr});
  }

  protected onUrlChange(value: string | null | undefined): void {
    // YouTube's Share → Embed dialog hands authors a full ``<iframe>``
    // HTML snippet. Peel the ``src`` out when that's what was pasted so
    // the bloc works without forcing the author to manually trim down.
    const url = extractIframeSrc(value ?? '');
    const current = this.currentBlock();
    // Auto-detect provider when the URL matches a known host. Never
    // downgrade an explicit upload-mode pick; only set a provider when
    // we recognise the URL, leaving manual overrides untouched.
    const detected = detectProvider(url);
    const next: ContentBlock = {...current, video_url: url};
    if (detected && current.video_provider !== detected) {
      next.video_provider = detected;
    }
    this.localBlock.set(next);
  }

  protected onProviderChange(value: VideoProvider | '' | null | undefined): void {
    const current = this.currentBlock();
    this.localBlock.set({...current, video_provider: value ?? ''});
  }

  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }
}

/** Provider detection delegated to the shared ``isYoutubeUrl`` URL
 *  parser (handles every recognised YouTube host variant via
 *  ``URL.hostname`` rather than a host-name regex). Vimeo stays a
 *  local regex — there's no shared helper for it yet. */
function detectProvider(url: string): VideoProvider | null {
  if (isYoutubeUrl(url)) {
    return 'youtube';
  }
  if (/vimeo\.com/i.test(url)) {
    return 'vimeo';
  }
  return null;
}

function extractIframeSrc(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return match ? match[1] : trimmed;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
