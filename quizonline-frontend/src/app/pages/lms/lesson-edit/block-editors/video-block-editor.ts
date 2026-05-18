import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {VideoProvider, getLmsCommonUiText} from '../../../../shared/lms/lms-common.i18n';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``video`` ContentBlock.
 *
 * Translatable: a per-language ``title`` (caption / aria-label).
 * Non-translatable: the canonical ``video_url`` and the
 * ``video_provider`` (``youtube`` / ``vimeo`` / ``upload``). The
 * provider drop-down sources its labels from the shared LMS common
 * dictionary so labels stay consistent with the renderer.
 */
@Component({
  selector: 'app-video-block-editor',
  imports: [FormsModule, InputTextModule, SelectModule, TabsModule, BlockTranslateButton],
  template: `
    <p-tabs [value]="activeLang()" (valueChange)="activeLang.set($any($event))">
      <p-tablist>
        @for (lang of availableLangs(); track lang) {
          <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
        }
        <div class="tablist-actions">
          <app-block-translate-button
            [block]="block()"
            [availableLangs]="availableLangs()"
            [activeLang]="activeLang()"
            (changed)="changed.emit($event)" />
        </div>
      </p-tablist>
      <p-tabpanels>
        @for (lang of availableLangs(); track lang) {
          <p-tabpanel [value]="lang">
            <label>
              {{ ui().fieldTitle }}
              <input pInputText type="text"
                     [ngModel]="titleFor(lang)"
                     (ngModelChange)="onTitleChange(lang, $event)" />
            </label>
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>

    <div class="field-row">
      <label>
        {{ ui().fieldVideoUrl }}
        <input pInputText type="url"
               [ngModel]="block().video_url"
               (ngModelChange)="onUrlChange($event)" />
      </label>

      <label>
        {{ ui().fieldVideoProvider }}
        <p-select [options]="providerOptions()"
                  [ngModel]="block().video_provider || null"
                  optionLabel="label"
                  optionValue="value"
                  (ngModelChange)="onProviderChange($event)" />
      </label>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
    label { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; min-width: 240px; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoBlockEditor implements OnInit, OnDestroy {
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);
  protected readonly common = inject(UiTextService).localized(getLmsCommonUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  protected readonly activeLang = signal<string>('');
  private readonly firstLang = computed(() => this.availableLangs()[0] ?? 'fr');

  protected readonly providerOptions = computed(() => {
    const labels = this.common().videoProviderLabels;
    return (['youtube', 'vimeo', 'upload'] satisfies VideoProvider[]).map((value) => ({
      value,
      label: labels[value],
    }));
  });

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.activeLang.set(this.firstLang());
    this.sub = this.debouncer$
      .pipe(debounceTime(500))
      .subscribe((patch) => this.changed.emit(patch));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  protected titleFor(lang: string): string {
    return this.block().translations?.[lang]?.['title'] ?? '';
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.debouncer$.next({translations: tr});
  }

  protected onUrlChange(value: string | null | undefined): void {
    this.debouncer$.next({video_url: value ?? ''});
  }

  protected onProviderChange(value: VideoProvider | '' | null | undefined): void {
    this.debouncer$.next({video_provider: value ?? ''});
  }
}
