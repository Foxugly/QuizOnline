import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UserService} from '../../../../services/user/user';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickDefaultLang} from '../../../../shared/lms/default-lang';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``code`` ContentBlock.
 *
 * Per-language tabs hosting a single translatable ``title`` (used as
 * the block-outline label), plus the non-translatable ``code_language``
 * (highlight.js class) and ``code_content`` (raw source).
 */
@Component({
  selector: 'app-code-block-editor',
  imports: [FormsModule, InputTextModule, TabsModule, TextareaModule, BlockTranslateButton],
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

    <label class="field">
      {{ ui().fieldCodeLanguage }}
      <input pInputText type="text"
             [ngModel]="block().code_language"
             (ngModelChange)="onLangChange($event)" />
    </label>
    <label class="field">
      {{ ui().fieldCodeContent }}
      <textarea pInputTextarea rows="8" class="code-content"
                [ngModel]="block().code_content"
                (ngModelChange)="onContentChange($event)"></textarea>
    </label>
  `,
  styles: [`
    :host { display: block; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .code-content { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockEditor implements OnInit, OnDestroy {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
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

  protected onLangChange(value: string | null | undefined): void {
    this.debouncer$.next({code_language: value ?? ''});
  }

  protected onContentChange(value: string | null | undefined): void {
    this.debouncer$.next({code_content: value ?? ''});
  }
}
