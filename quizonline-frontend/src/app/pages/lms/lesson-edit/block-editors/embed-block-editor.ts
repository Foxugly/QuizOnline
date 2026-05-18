import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``embed`` ContentBlock (generic third-party iframe).
 *
 * Translatable: per-language ``title`` shown as the iframe ``title``
 * attribute by the renderer. Non-translatable: the canonical
 * ``external_url`` that backs the ``<iframe src>``.
 */
@Component({
  selector: 'app-embed-block-editor',
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

    <label>
      {{ ui().fieldExternalUrl }}
      <input pInputText type="url"
             [ngModel]="block().external_url"
             (ngModelChange)="onUrlChange($event)" />
    </label>
  `,
  styles: [`
    :host { display: block; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbedBlockEditor implements OnInit, OnDestroy {
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

  protected onUrlChange(value: string | null | undefined): void {
    this.debouncer$.next({external_url: value ?? ''});
  }
}
