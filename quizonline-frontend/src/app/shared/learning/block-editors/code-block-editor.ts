import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';

import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickDefaultLang} from '../../../shared/learning/default-lang';

import {getBlockListEditorUiText} from '../../../shared/learning/block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``code`` ContentBlock.
 *
 * Per-language tabs hosting a single translatable ``title`` (used as
 * the block-outline label), plus the non-translatable ``code_language``
 * (highlight.js class) and ``code_content`` (raw source).
 */
@Component({
  selector: 'app-code-block-editor',
  imports: [FormsModule, ButtonModule, InputTextModule, TabsModule, TextareaModule, BlockTranslateButton],
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
      {{ ui().fieldCodeLanguage }}
      <input pInputText type="text"
             [ngModel]="currentBlock().code_language"
             (ngModelChange)="onLangChange($event)" />
    </label>
    <label class="field">
      {{ ui().fieldCodeContent }}
      <textarea pInputTextarea rows="8" class="code-content"
                [ngModel]="currentBlock().code_content"
                (ngModelChange)="onContentChange($event)"></textarea>
    </label>
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
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .code-content { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockEditor implements OnInit {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  /** Hide the per-language title input (and its language tab strip, since
   *  the title is the only translatable field on this block). Used by
   *  question hosts where blocks have no learner-facing outline. */
  readonly hideTitle = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  private readonly localBlock = signal<ContentBlock | null>(null);
  protected readonly currentBlock = computed(() => this.localBlock() ?? this.block());

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

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

  protected onLangChange(value: string | null | undefined): void {
    const current = this.currentBlock();
    this.localBlock.set({...current, code_language: value ?? ''});
  }

  protected onContentChange(value: string | null | undefined): void {
    const current = this.currentBlock();
    this.localBlock.set({...current, code_content: value ?? ''});
  }

  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }
}
