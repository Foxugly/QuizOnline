import {ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AutoCompleteModule, AutoCompleteCompleteEvent} from 'primeng/autocomplete';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TagModule} from 'primeng/tag';

import {QuizTemplateListDto} from '../../../api/generated/model/quiz-template-list';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../api/api-errors';
import {UiTextService} from '../../i18n/ui-text.service';
import {ContentBlock} from '../content-block.types';
import {pickDefaultLang} from '../default-lang';

import {getBlockListEditorUiText} from '../block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/** Defensive option-label resolver passed to ``<p-autoComplete>`` via
 *  ``[optionLabel]``. PrimeNG calls
 *  ``getOptionLabel(option).toLocaleLowerCase()`` for ``forceSelection``
 *  matching — if a single template comes back with ``title`` as a dict
 *  (translations object that escaped the serializer) the whole picker
 *  used to crash. Returning a guaranteed string from this callback keeps
 *  the picker alive even when the backend slips. Used in addition to
 *  the data-layer ``coerceTitle`` sanitize in ``loadTemplates`` so a
 *  malformed row only loses its own label, not the entire dropdown. */
function quizTemplateOptionLabel(option: QuizTemplateListDto | string): string {
  if (typeof option === 'string') {
    return option;
  }
  const t = (option as QuizTemplateListDto)?.title;
  return typeof t === 'string' ? t : '';
}

function coerceTitle(title: unknown): string {
  return typeof title === 'string' ? title : '';
}

/**
 * Editor for the ``quiz`` ContentBlock.
 *
 * Per-language tabs hosting a single translatable ``title`` (block
 * label) and a ``<p-autoComplete>`` quiz-template picker scoped to
 * the parent course's domain. Authors search by title; matched
 * templates show their mode + question count in the dropdown so the
 * picker doubles as a quick preview. The underlying quiz template
 * still owns its own translated questions / answers — the ``title``
 * field here only labels the block in the lesson.
 */
@Component({
  selector: 'app-quiz-block-editor',
  imports: [FormsModule, AutoCompleteModule, ButtonModule, InputTextModule, TabsModule, TagModule, BlockTranslateButton],
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

    <div class="field">
      <span>{{ ui().fieldQuizTemplate }}</span>
      <p-autoComplete
        [ngModel]="selectedTemplate()"
        [suggestions]="suggestions()"
        (completeMethod)="search($event)"
        (ngModelChange)="onTemplatePick($event)"
        [forceSelection]="true"
        [dropdown]="true"
        [delay]="200"
        [optionLabel]="optionLabel"
        appendTo="body"
        [placeholder]="ui().quizTemplatePlaceholder"
        emptyMessage="—">
        <ng-template let-tpl #item>
          <div class="picker-item">
            <span class="picker-item__title">{{ tpl.title }}</span>
            <span class="picker-item__meta">
              <p-tag [value]="tpl.mode" severity="info" />
              <span>{{ tpl.questions_count }} q.</span>
            </span>
          </div>
        </ng-template>
      </p-autoComplete>
      @if (selectedTemplate(); as tpl) {
        <div class="selected-preview">
          <p-tag [value]="tpl.mode" severity="info" />
          <span>{{ tpl.questions_count }} q.</span>
        </div>
      }
    </div>

    <div class="block-editor-footer">
      <p-button type="button" severity="secondary" [outlined]="true"
                icon="pi pi-times"
                [label]="listUi().cancelBlockLabel"
                [disabled]="saving()"
                (onClick)="cancel.emit()" />
      <p-button type="button"
                icon="pi pi-save"
                [label]="listUi().saveBlockLabel"
                [loading]="saving()"
                [disabled]="saving()"
                (onClick)="save.emit(currentBlock())" />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .picker-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-width: 18rem; }
    .picker-item__meta { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-color-secondary, #6b7280); font-size: 0.78rem; }
    .selected-preview { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-color-secondary, #6b7280); font-size: 0.78rem; margin-top: 0.3rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockEditor implements OnInit {
  private readonly user = inject(UserService);
  private readonly quizTemplates = inject(QuizTemplateService);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  readonly domainId = input<number | null>(null);
  readonly hideTitle = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  private readonly localBlock = signal<ContentBlock | null>(null);
  protected readonly currentBlock = computed(() => this.localBlock() ?? this.block());

  protected readonly allTemplates = signal<QuizTemplateListDto[]>([]);
  protected readonly suggestions = signal<QuizTemplateListDto[]>([]);
  protected readonly selectedTemplate = signal<QuizTemplateListDto | null>(null);
  /** Bound to ``[optionLabel]`` on the ``<p-autoComplete>``. Replaces the
   *  legacy ``field="title"`` string binding so ``forceSelection``'s
   *  ``getOptionLabel(option).toLocaleLowerCase()`` is always given a
   *  string, even if a single template's ``title`` arrives as a dict. */
  protected readonly optionLabel = quizTemplateOptionLabel;

  constructor() {
    effect(() => {
      const id = this.currentBlock().quiz_template;
      const cache = this.allTemplates();
      if (!id) {
        this.selectedTemplate.set(null);
        return;
      }
      const found = cache.find((t) => t.id === id) ?? null;
      this.selectedTemplate.set(found);
    });
  }

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.quizTemplates.listForPicker(this.domainId()).subscribe({
      next: (list) => {
        const sanitized = list.map((t) => ({...t, title: coerceTitle(t.title)}));
        this.allTemplates.set(sanitized);
        this.suggestions.set(sanitized);
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.quiz-picker.load', err);
        this.allTemplates.set([]);
        this.suggestions.set([]);
      },
    });
  }

  protected search(event: AutoCompleteCompleteEvent): void {
    const q = (event.query ?? '').toLowerCase().trim();
    const cache = this.allTemplates();
    if (!q) {
      this.suggestions.set(cache);
      return;
    }
    this.suggestions.set(cache.filter((t) => t.title.toLowerCase().includes(q)));
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

  protected onTemplatePick(value: QuizTemplateListDto | string | null): void {
    if (typeof value === 'string' || value === null) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, quiz_template: value.id});
  }

  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }
}
