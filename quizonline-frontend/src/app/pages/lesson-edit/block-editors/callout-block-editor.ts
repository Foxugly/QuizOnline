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
 * Editor for the ``callout`` ContentBlock — an info / tip banner with
 * a localized ``title`` and a localized ``callout_text`` body. Both
 * fields are translatable; non-translatable callout colour / variant
 * is currently stored in ``metadata`` and not exposed by this MVP
 * editor.
 *
 * Explicit-save model (see ``block-list-editor``):
 * - every input writes to a ``localBlock`` signal, never directly to
 *   the network;
 * - the bottom-right ``Enregistrer`` / ``Annuler`` buttons emit
 *   ``(save)`` / ``(cancel)`` for the parent list editor to drive the
 *   network roundtrip.
 */
@Component({
  selector: 'app-callout-block-editor',
  imports: [FormsModule, ButtonModule, InputTextModule, TabsModule, TextareaModule, BlockTranslateButton],
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
              <label>
                {{ ui().fieldTitle }}
                <input pInputText type="text"
                       [ngModel]="titleFor(lang)"
                       (ngModelChange)="onChange(lang, 'title', $event)" />
              </label>
            }
            <label>
              {{ ui().fieldCalloutBody }}
              <textarea pInputTextarea rows="3"
                        [ngModel]="bodyFor(lang)"
                        (ngModelChange)="onChange(lang, 'callout_text', $event)"></textarea>
            </label>
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
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalloutBlockEditor implements OnInit {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  /** Hide the per-language title input. Question hosts (prompt /
   *  answer / explanation blocks) don't need block titles since the
   *  blocks aren't outlined in a learner-facing navigation — the
   *  lesson-view block outline that consumes ``title`` only exists
   *  for lesson hosts. */
  readonly hideTitle = input<boolean>(false);
  /** Driven by the parent list editor: ``true`` while a Save round-trip
   *  is in flight so the footer buttons can render disabled / loading. */
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  /** Local working copy of the block. ``null`` means "no edits yet —
   *  read straight from ``block()``". Every user-triggered change
   *  upgrades the signal to a full ``ContentBlock`` and subsequent
   *  reads (incl. the translate button) go through ``currentBlock``. */
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

  protected bodyFor(lang: string): string {
    return this.currentBlock().translations?.[lang]?.['callout_text'] ?? '';
  }

  protected onChange(lang: string, field: 'title' | 'callout_text', value: string | null | undefined): void {
    const current = this.currentBlock();
    const tr = {...(current.translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), [field]: value ?? ''};
    this.localBlock.set({...current, translations: tr});
  }

  /** Apply a partial patch produced by the inline ``Translate from
   *  active tab`` button. The translate button accumulates the new
   *  translations map into a single ``Partial<ContentBlock>``; we fold
   *  it into ``localBlock`` so the user can review the autotranslation
   *  before clicking Save. */
  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }
}
