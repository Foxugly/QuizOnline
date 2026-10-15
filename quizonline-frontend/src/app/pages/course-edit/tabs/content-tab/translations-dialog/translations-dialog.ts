import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';
import {ToggleSwitchModule} from 'primeng/toggleswitch';

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {CatalogService} from '../../../../../services/catalog/catalog.service';
import {TranslateBatchItem, TranslationService} from '../../../../../services/translation/translation';
import {logApiError, userFacingApiMessage} from '../../../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {OutlineRef} from '../course-outline/course-outline';
import {getTranslationsDialogUiText} from './translations-dialog.i18n';

type Field = 'title' | 'description';
type TranslationsMap = Record<string, Record<string, string>>;

interface DialogForm {
  translations: TranslationsMap;
  activeLang: string;
  isPublished: boolean;
  isPreview: boolean;
  submitting: boolean;
}

/** Row fields the dialog reads and writes (common to sections and lessons). */
interface EditableRow {
  id: number;
  translations?: TranslationsMap;
  is_published?: boolean;
  is_preview?: boolean;
}

/**
 * "Translations…" dialog of the course outline: edits one section (title +
 * description) or one lesson (title) in every course language, plus its
 * publish / free-preview flags, with a "translate from this tab" button
 * that fills the blank languages only.
 *
 * Mounted by the content tab while open: ``closed`` asks the host to
 * unmount it, ``saved`` carries an immutable copy of the course with the
 * row patched (no refetch).
 *
 * The outline row may predate the background machine translation
 * (``course.tasks.fill_missing_translations``), so on open the dialog
 * GETs the section / lesson fresh and builds the form from it. On save it
 * only sends the languages / fields the author actually changed against
 * those loaded values — an untouched blank language is never sent, so it
 * can never erase a translation filled in the meantime.
 */
@Component({
  selector: 'app-translations-dialog',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TabsModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './translations-dialog.html',
  styleUrl: './translations-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationsDialog {
  private readonly catalog = inject(CatalogService);
  private readonly translator = inject(TranslationService);
  private readonly toast = inject(AppToastService);

  protected readonly ui = inject(UiTextService).localized(getTranslationsDialogUiText);

  readonly course = input.required<CourseDetailDto>();
  readonly target = input.required<OutlineRef>();
  readonly saved = output<CourseDetailDto>();
  readonly closed = output<void>();

  protected readonly visible = signal(true);
  protected readonly translating = signal(false);
  private done = false;

  protected readonly isSection = computed(() => this.target().kind === 'section');
  protected readonly labels = computed(() =>
    this.isSection() ? this.ui().sectionDialog : this.ui().lessonDialog,
  );
  protected readonly languages = computed(() => this.course().available_lang_codes ?? []);
  private readonly primaryLang = computed(
    () => this.course().language_code || this.languages()[0] || 'en',
  );
  private readonly fields = computed<Field[]>(() =>
    this.isSection() ? ['title', 'description'] : ['title'],
  );

  /** The outline's client-side row: fallback baseline if the fresh GET fails. */
  private readonly row = computed<EditableRow | undefined>(() => {
    const {kind, id} = this.target();
    const sections = this.course().sections ?? [];
    if (kind === 'section') {
      return sections.find((s) => s.id === id);
    }
    return sections.flatMap((s) => s.lessons ?? []).find((l) => l.id === id);
  });

  /** Values loaded on open; ``null`` while the GET is in flight. Also the
   *  reference ``submit`` diffs against. */
  private readonly baseline = signal<EditableRow | null>(null);
  protected readonly loading = computed(() => this.baseline() === null);

  protected readonly form = linkedSignal<DialogForm>(() => {
    const row = this.baseline();
    return {
      translations: this.translationsOf(row),
      activeLang: this.primaryLang(),
      isPublished: row?.is_published ?? false,
      isPreview: row?.is_preview ?? false,
      submitting: false,
    };
  });

  constructor() {
    effect(() => {
      const {kind, id} = this.target();
      untracked(() => this.load(kind, id));
    });
  }

  private load(kind: OutlineRef['kind'], id: number): void {
    this.baseline.set(null);
    const request$ = kind === 'section' ? this.catalog.getSection(id) : this.catalog.getLesson(id);
    request$.subscribe({
      next: (res) => {
        const current = this.target();
        if (current.kind !== kind || current.id !== id) {
          return; // stale response: the dialog now targets another row
        }
        const body = (res ?? {}) as Partial<EditableRow>;
        this.baseline.set({...(this.row() ?? {id}), ...body, id});
      },
      error: (err: unknown) => {
        logApiError(`lms.translations-dialog.load-${kind}`, err);
        this.toast.addApiError(err, this.ui().loadFailedToast);
        // Still usable: only changed values are sent, so a stale baseline
        // cannot blank a language the author did not touch.
        this.baseline.set(this.row() ?? {id});
      },
    });
  }

  /** Every course language x every field of the row, blanks as ``''``. */
  private translationsOf(row: EditableRow | null | undefined): TranslationsMap {
    const translations: TranslationsMap = {};
    for (const code of this.languages()) {
      translations[code] = Object.fromEntries(
        this.fields().map((f) => [f, row?.translations?.[code]?.[f] ?? '']),
      );
    }
    return translations;
  }

  protected onTabChange(value: string | number | undefined): void {
    if (value !== undefined && value !== null) {
      this.form.update((f) => ({...f, activeLang: String(value)}));
    }
  }

  protected setField(lang: string, field: Field, value: string): void {
    this.form.update((f) => ({
      ...f,
      translations: {...f.translations, [lang]: {...(f.translations[lang] ?? {}), [field]: value}},
    }));
  }

  protected setPublished(value: boolean): void {
    this.form.update((f) => ({...f, isPublished: value}));
  }

  protected setPreview(value: boolean): void {
    this.form.update((f) => ({...f, isPreview: value}));
  }

  /** Emits ``closed`` once, whether from Cancel, the X, Escape or a save. */
  protected close(): void {
    if (!this.done) {
      this.done = true;
      this.closed.emit();
    }
  }

  protected submit(): void {
    const state = this.form();
    if (state.submitting || this.loading()) {
      return;
    }
    const primary = this.primaryLang();
    if (!(state.translations[primary]?.['title'] ?? '').trim()) {
      this.toast.add({severity: 'warn', summary: this.ui().titleRequiredToast});
      this.form.update((f) => ({...f, activeLang: primary}));
      return;
    }
    // Only what changed against the loaded values: an untouched language
    // (blank or not) is left out, so the server keeps whatever it has.
    const loaded = this.translationsOf(this.baseline());
    const translations: TranslationsMap = {};
    for (const lang of this.languages()) {
      const row = state.translations[lang] ?? {};
      for (const f of this.fields()) {
        const value = f === 'title' ? (row[f] ?? '').trim() : (row[f] ?? '');
        if (value !== (loaded[lang]?.[f] ?? '')) {
          translations[lang] = {...(translations[lang] ?? {}), [f]: value};
        }
      }
    }
    const changed = Object.keys(translations).length > 0;
    const {kind, id} = this.target();
    const request$ =
      kind === 'section'
        ? this.catalog.updateSection(id, {
            is_published: state.isPublished,
            ...(changed ? {translations} : {}),
          })
        : this.catalog.updateLesson(id, {
            is_published: state.isPublished,
            is_preview: state.isPreview,
            ...(changed ? {translations} : {}),
          });
    this.form.update((f) => ({...f, submitting: true}));
    request$.subscribe({
      next: (res) => {
        const body = (res ?? {}) as Partial<EditableRow>;
        // Server translations when returned (they include the background
        // fill), else loaded values + our changes: either way the outline's
        // "missing languages" hint reflects the real state.
        const patch: Partial<EditableRow> = {
          translations: body.translations ?? this.mergeTranslations(loaded, translations),
          is_published: body.is_published ?? state.isPublished,
          ...(kind === 'lesson' ? {is_preview: body.is_preview ?? state.isPreview} : {}),
        };
        this.saved.emit(this.patchCourse(patch));
        this.toast.add({
          severity: 'success',
          summary: kind === 'section' ? this.ui().sectionUpdatedToast : this.ui().lessonUpdatedToast,
        });
        this.close();
      },
      error: (err: unknown) => {
        logApiError(`lms.translations-dialog.update-${kind}`, err);
        this.form.update((f) => ({...f, submitting: false}));
        this.toast.addApiError(err, this.ui().actionFailedToast);
      },
    });
  }

  /**
   * Fills the blank languages from the active tab: title as plain text,
   * description as HTML; non-empty values are never overwritten.
   */
  protected async translateFromActiveTab(): Promise<void> {
    const state = this.form();
    if (this.loading()) {
      return;
    }
    const source = state.activeLang;
    const langs = this.languages();
    if (!source || !langs.includes(source)) {
      return;
    }
    const sourceRow = state.translations[source] ?? {};
    const plans = langs
      .filter((target) => target !== source)
      .map((target) => {
        const row = state.translations[target] ?? {};
        const items: TranslateBatchItem[] = this.fields()
          .filter((f) => (f === 'title' ? !(row[f] ?? '').trim() : isEmptyRichText(row[f] ?? '')))
          .map((f) => ({key: f, text: sourceRow[f] ?? '', format: f === 'title' ? 'text' : 'html'}));
        return {target, items};
      })
      .filter((p) => p.items.length > 0);
    if (!plans.length) {
      return;
    }
    this.translating.set(true);
    try {
      const results = await Promise.all(
        plans.map((p) => this.translator.translateBatch(source, p.target, p.items).then((out) => ({p, out}))),
      );
      for (const {p, out} of results) {
        for (const item of p.items) {
          if (out[item.key] !== undefined) {
            this.setField(p.target, item.key as Field, out[item.key]);
          }
        }
      }
    } catch (err) {
      logApiError(`lms.translations-dialog.translate-${this.target().kind}`, err);
      this.toast.add({
        severity: 'error',
        summary: userFacingApiMessage(err, this.labels().translationFailed),
      });
    } finally {
      this.translating.set(false);
    }
  }

  private mergeTranslations(base: TranslationsMap, changes: TranslationsMap): TranslationsMap {
    const merged: TranslationsMap = {...base};
    for (const [lang, fields] of Object.entries(changes)) {
      merged[lang] = {...(merged[lang] ?? {}), ...fields};
    }
    return merged;
  }

  private patchCourse(patch: Partial<EditableRow>): CourseDetailDto {
    const c = this.course();
    const {kind, id} = this.target();
    return {
      ...c,
      sections: (c.sections ?? []).map((s) => {
        if (kind === 'section') {
          return s.id === id ? {...s, ...patch} : s;
        }
        return s.lessons?.some((l) => l.id === id)
          ? {...s, lessons: s.lessons.map((l) => (l.id === id ? {...l, ...patch} : l))}
          : s;
      }),
    } as CourseDetailDto;
  }
}
