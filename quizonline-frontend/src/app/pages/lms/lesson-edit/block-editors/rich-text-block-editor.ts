import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {EditorModule} from 'primeng/editor';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Multilingual rich-text editor for the ``rich_text`` ContentBlock.
 *
 * One Quill instance per available language; we debounce keystrokes
 * (500 ms) before emitting a ``Partial<ContentBlock>`` patch that the
 * lesson-edit shell PATCHes against ``/api/lms/block/{id}/``. Field
 * naming mirrors the serializer wire shape — translations live under
 * ``translations[lang].rich_text`` so the renderer and editor agree.
 */
@Component({
  selector: 'app-rich-text-block-editor',
  imports: [FormsModule, EditorModule, TabsModule],
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
            <p-editor [ngModel]="bodyFor(lang)"
                      (ngModelChange)="onChange(lang, $event)"
                      [style]="{ height: '200px' }" />
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextBlockEditor implements OnInit, OnDestroy {
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

  protected bodyFor(lang: string): string {
    return this.block().translations?.[lang]?.['rich_text'] ?? '';
  }

  protected onChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), rich_text: value ?? ''};
    this.debouncer$.next({translations: tr});
  }
}
