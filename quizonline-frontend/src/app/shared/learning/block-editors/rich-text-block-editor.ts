import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {EditorModule} from 'primeng/editor';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';

import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../i18n/ui-text.service';
import {ContentBlock} from '../content-block.types';
import {pickDefaultLang} from '../default-lang';

import {getBlockListEditorUiText} from '../block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Multilingual rich-text editor for the ``rich_text`` ContentBlock.
 *
 * One Quill instance per available language. Every keystroke folds
 * into a ``localBlock`` signal — the parent list editor decides when
 * the round-trip happens via the explicit Save / Cancel buttons in
 * the footer (see ``block-list-editor`` for the orchestration).
 */
@Component({
  selector: 'app-rich-text-block-editor',
  imports: [FormsModule, ButtonModule, EditorModule, InputTextModule, TabsModule, BlockTranslateButton],
  host: {
    '[class.rich-text-block-editor--autogrow]': 'autogrow()',
  },
  template: `
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
            @if (!hideTitle()) {
              <label class="field">
                {{ ui().fieldTitle }}
                <input pInputText type="text"
                       [ngModel]="titleFor(lang)"
                       (ngModelChange)="onTitleChange(lang, $event)" />
              </label>
            }
            <p-editor [ngModel]="bodyFor(lang)"
                      (ngModelChange)="onChange(lang, $event)"
                      [style]="autogrow() ? {} : { height: '200px' }" />
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>

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
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin: 0.5rem 0; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }

    /* Autogrow mode (turned on by the question host so the prompt /
     * answer / explanation rich-text editors start as a single line
     * and grow with content rather than wasting 200 px upfront). Quill
     * caps its container at the host element's height by default; we
     * unpin both the container and the editable to height:auto and set
     * a single-line minimum on the editable so an empty editor is
     * still clickable. */
    :host(.rich-text-block-editor--autogrow) ::ng-deep .p-editor-container,
    :host(.rich-text-block-editor--autogrow) ::ng-deep .p-editor-container .ql-container {
      height: auto;
    }
    :host(.rich-text-block-editor--autogrow) ::ng-deep .p-editor-container .ql-editor {
      min-height: 1.6em;
      max-height: none;
      height: auto;
      overflow-y: visible;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextBlockEditor implements OnInit {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  readonly hideTitle = input<boolean>(false);
  readonly autogrow = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  private readonly localBlock = signal<ContentBlock | null>(null);
  protected readonly currentBlock = computed(() => this.localBlock() ?? this.block());

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
  }

  protected bodyFor(lang: string): string {
    return this.currentBlock().translations?.[lang]?.['rich_text'] ?? '';
  }

  protected titleFor(lang: string): string {
    return this.currentBlock().translations?.[lang]?.['title'] ?? '';
  }

  protected onChange(lang: string, value: string | null | undefined): void {
    const current = this.currentBlock();
    const tr = {...(current.translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), rich_text: value ?? ''};
    this.localBlock.set({...current, translations: tr});
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const current = this.currentBlock();
    const tr = {...(current.translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.localBlock.set({...current, translations: tr});
  }

  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }
}
