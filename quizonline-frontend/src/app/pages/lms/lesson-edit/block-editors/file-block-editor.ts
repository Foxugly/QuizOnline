import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``file`` ContentBlock (generic downloadable asset).
 *
 * Translatable: per-language ``title`` shown as the download link
 * label by the renderer. The non-translatable ``file`` URL is
 * read-only here; the upload action is added in the T67 commit
 * (:class:`LmsUploadService`) so this editor compiles standalone.
 */
@Component({
  selector: 'app-file-block-editor',
  imports: [FormsModule, InputTextModule, TabsModule],
  template: `
    <p-tabs [value]="availableLangs()[0]">
      <p-tablist>
        @for (lang of availableLangs(); track lang) {
          <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
        }
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

    @if (block().file; as url) {
      <p class="current-url"><strong>{{ ui().currentFileLabel }}:</strong> {{ url }}</p>
    }
  `,
  styles: [`
    :host { display: block; }
    .current-url { font-size: 0.85rem; color: var(--text-color-secondary, #6b7280); word-break: break-all; }
    label { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileBlockEditor implements OnInit, OnDestroy {
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
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
}
