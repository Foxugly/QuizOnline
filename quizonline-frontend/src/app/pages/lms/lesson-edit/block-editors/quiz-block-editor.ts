import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AutoCompleteModule, AutoCompleteCompleteEvent} from 'primeng/autocomplete';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TagModule} from 'primeng/tag';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {QuizTemplateApi as QuizTemplateApiService} from '../../../../api/generated/api/quiz-template.service';
import {QuizTemplateListDto} from '../../../../api/generated/model/quiz-template-list';
import {UserService} from '../../../../services/user/user';
import {logApiError} from '../../../../shared/api/api-errors';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickDefaultLang} from '../../../../shared/lms/default-lang';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

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
  imports: [FormsModule, AutoCompleteModule, InputTextModule, TabsModule, TagModule, BlockTranslateButton],
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
        field="title"
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
  `,
  styles: [`
    :host { display: block; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .picker-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-width: 18rem; }
    .picker-item__meta { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-color-secondary, #6b7280); font-size: 0.78rem; }
    .selected-preview { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-color-secondary, #6b7280); font-size: 0.78rem; margin-top: 0.3rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockEditor implements OnInit, OnDestroy {
  private readonly user = inject(UserService);
  private readonly api = inject(QuizTemplateApiService);
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  /** Domain id of the parent course — narrows the picker so authors
   *  cannot pick a quiz from another domain (the backend rejects that
   *  combo on save anyway, but pre-filtering keeps the picker honest). */
  domainId = input<number | null>(null);
  changed = output<Partial<ContentBlock>>();

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  /** All quiz templates accessible to the user in the parent domain.
   *  Loaded once when ``domainId`` resolves; suggestions are derived
   *  from this cache so typing stays instant after the first fetch. */
  protected readonly allTemplates = signal<QuizTemplateListDto[]>([]);
  protected readonly suggestions = signal<QuizTemplateListDto[]>([]);
  /** The currently-selected template view-model (or ``null`` until a
   *  template is picked / loaded). Resolved by matching ``block.quiz_template``
   *  against ``allTemplates()`` once both are present. */
  protected readonly selectedTemplate = signal<QuizTemplateListDto | null>(null);

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  constructor() {
    // Whenever the cache or the block's quiz_template id changes, keep
    // ``selectedTemplate`` in sync — handles both first-paint
    // (templates load late) and external mutations (the shell may
    // patch the block after a save).
    effect(() => {
      const id = this.block().quiz_template;
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
    this.sub = this.debouncer$
      .pipe(debounceTime(500))
      .subscribe((patch) => this.changed.emit(patch));
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  /** Fetch the first page of quiz templates accessible to the user.
   *  The backend already gates the list to the user's manageable
   *  domains; we further narrow to ``domainId`` client-side so the
   *  picker never surfaces a wrong-domain template. */
  private loadTemplates(): void {
    this.api.quizTemplateList().subscribe({
      next: (resp) => {
        const list = resp?.results ?? [];
        const dId = this.domainId();
        const scoped = dId ? list.filter((t) => t.domain === dId) : list;
        this.allTemplates.set(scoped);
        this.suggestions.set(scoped);
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
    return this.block().translations?.[lang]?.['title'] ?? '';
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.debouncer$.next({translations: tr});
  }

  protected onTemplatePick(value: QuizTemplateListDto | string | null): void {
    // ``forceSelection`` keeps the value object-shaped on commit, but a
    // typed-yet-not-selected input arrives as a string — discard it.
    if (typeof value === 'string' || value === null) {
      return;
    }
    this.debouncer$.next({quiz_template: value.id});
  }
}
