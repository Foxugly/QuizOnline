import {CommonModule} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';

import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DialogModule} from 'primeng/dialog';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {TooltipModule} from 'primeng/tooltip';

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {LessonDetailDto} from '../../../../../api/generated/model/lesson-detail';
import {SectionDto} from '../../../../../api/generated/model/section';

import {LMS_LESSON_EDIT} from '../../../../../app.routes-paths';
import {LmsCatalogService} from '../../../../../services/lms/lms-catalog.service';
import {
  TranslateBatchItem,
  TranslationService,
} from '../../../../../services/translation/translation';
import {EmptyStateComponent} from '../../../../../shared/components/empty-state/empty-state';
import {logApiError, userFacingApiMessage} from '../../../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {getLmsCourseEditStructureTabUiText} from './structure-tab.i18n';

/**
 * Inline slugify helper used to derive lesson slugs from the
 * effective-language title. Mirrors the backend ``slug`` validator
 * pattern ``^[a-z0-9]+(?:-[a-z0-9]+)*$`` and the lesson model's
 * ``max_length=220`` constraint. Lifted from ``course-create`` so the
 * two pages stay consistent without leaking a half-shared helper.
 */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
}

/**
 * The course-detail DTO exposes ``available_lang_codes`` as a flat
 * string on the generated type because the backend
 * ``SerializerMethodField`` doesn't carry a schema, but the actual
 * payload is ``string[]`` (mirrors :class:`CourseDetailSerializer`).
 * Narrowed locally so we can pull it cleanly without polluting the
 * generated client.
 */
type CourseWithLangCodes = CourseDetailDto & {
  available_lang_codes: string[] | string;
};

/** Per-lang form state used by both the section and lesson dialogs. */
type TranslationsMap = Record<string, Record<string, string>>;

/**
 * Dialog state for the section create/edit modal. ``id === null``
 * represents the "create" mode; otherwise we're editing the matching
 * row.
 */
interface SectionDialogState {
  visible: boolean;
  id: number | null;
  isPublished: boolean;
  translations: TranslationsMap;
  activeLang: string;
  submitting: boolean;
}

/** Mirror of ``SectionDialogState`` but for the lesson dialog. */
interface LessonDialogState {
  visible: boolean;
  id: number | null;
  sectionId: number;
  isPublished: boolean;
  isPreview: boolean;
  translations: TranslationsMap;
  activeLang: string;
  submitting: boolean;
}

/**
 * Structure tab of the course-edit page.
 *
 * Renders the course's ordered list of sections — each with its own
 * inline list of lessons — and exposes the full CRUD surface needed
 * to author the course outline:
 *
 *   * drag-and-drop reorder of sections (top-level list) and lessons
 *     (per-section nested list) via ``@angular/cdk/drag-drop``;
 *   * inline toggles for ``is_published`` (sections + lessons) and
 *     ``is_preview`` (lessons);
 *   * create/edit dialogs with one input per allowed language;
 *   * delete with confirm dialog (cascades to lessons + content
 *     blocks server-side);
 *   * "Edit content" deep-link to ``/lms/lesson/{id}/edit``.
 *
 * Every mutating call funnels through :class:`LmsCatalogService`
 * and emits ``changed`` on success so the shell can re-fetch and
 * keep the page-header publish button in sync with the freshly
 * mutated tree.
 */
@Component({
  selector: 'app-lms-course-edit-structure-tab',
  templateUrl: './structure-tab.html',
  styleUrl: './structure-tab.scss',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TabsModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
    EmptyStateComponent,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditStructureTab {
  private readonly catalog = inject(LmsCatalogService);
  private readonly confirmer = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);
  private readonly translator = inject(TranslationService);

  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditStructureTabUiText);

  /**
   * Per-dialog translating flag so the section and lesson dialog buttons
   * spin independently. Each value is the dialog that's currently fanning
   * out translations (or ``null`` when idle).
   */
  protected readonly translating = signal<'section' | 'lesson' | null>(null);

  readonly courseId = input.required<number>();
  readonly course = input<CourseDetailDto | null>(null);
  readonly changed = output<void>();

  /** Allowed languages of the parent course's domain. Defaults to ``['en']`` to keep the tab usable while the shell is still loading. */
  protected readonly languages = computed<string[]>(() => {
    const c = this.course() as CourseWithLangCodes | null;
    if (!c) {
      return [];
    }
    const codes = c.available_lang_codes;
    if (Array.isArray(codes) && codes.length > 0) {
      return codes;
    }
    if (typeof codes === 'string' && codes.length > 0) {
      // Defensive: handle the legacy ``"en,fr"`` shape some old
      // serializers fell back to. The backend currently returns a
      // proper list but the generated DTO types it as ``string``.
      return codes.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });

  /** Primary (course-language) code; falls back to first allowed. */
  protected readonly primaryLang = computed<string>(() => {
    const c = this.course();
    if (c?.language_code) {
      return c.language_code;
    }
    const langs = this.languages();
    return langs[0] ?? 'en';
  });

  protected readonly sections = computed<SectionDto[]>(() => {
    const c = this.course();
    if (!c?.sections) {
      return [];
    }
    return [...c.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  // -- Dialog state --------------------------------------------------------

  protected readonly sectionDialog = signal<SectionDialogState>({
    visible: false,
    id: null,
    isPublished: false,
    translations: {},
    activeLang: 'en',
    submitting: false,
  });

  protected readonly lessonDialog = signal<LessonDialogState>({
    visible: false,
    id: null,
    sectionId: 0,
    isPublished: false,
    isPreview: false,
    translations: {},
    activeLang: 'en',
    submitting: false,
  });

  // -- Display helpers -----------------------------------------------------

  protected sectionTitle(section: SectionDto): string {
    return this.pickTranslated(section.translations, 'title') || this.ui().untitledSection;
  }

  protected lessonTitle(lesson: LessonDetailDto): string {
    return this.pickTranslated(lesson.translations, 'title') || this.ui().untitledLesson;
  }

  protected sortedLessons(section: SectionDto): LessonDetailDto[] {
    return [...(section.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Pick the title (or any other translated field) in the primary lang, falling back to any populated language. */
  private pickTranslated(
    translations: {[key: string]: {[key: string]: string}} | undefined,
    field: string,
  ): string {
    if (!translations) {
      return '';
    }
    const primary = this.primaryLang();
    const primaryValue = translations[primary]?.[field];
    if (primaryValue) {
      return primaryValue;
    }
    for (const lang of Object.keys(translations)) {
      const value = translations[lang]?.[field];
      if (value) {
        return value;
      }
    }
    return '';
  }

  // -- Section dialog ------------------------------------------------------

  protected openSectionDialogCreate(): void {
    const langs = this.languages();
    const blank: TranslationsMap = {};
    for (const code of langs) {
      blank[code] = {title: '', description: ''};
    }
    this.sectionDialog.set({
      visible: true,
      id: null,
      isPublished: false,
      translations: blank,
      activeLang: this.primaryLang(),
      submitting: false,
    });
  }

  protected openSectionDialogEdit(section: SectionDto): void {
    const langs = this.languages();
    const tr: TranslationsMap = {};
    for (const code of langs) {
      const row = section.translations?.[code];
      tr[code] = {
        title: row?.['title'] ?? '',
        description: row?.['description'] ?? '',
      };
    }
    this.sectionDialog.set({
      visible: true,
      id: section.id,
      isPublished: section.is_published ?? false,
      translations: tr,
      activeLang: this.primaryLang(),
      submitting: false,
    });
  }

  protected closeSectionDialog(): void {
    this.sectionDialog.update((s) => ({...s, visible: false, submitting: false}));
  }

  protected onSectionDialogTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    this.sectionDialog.update((s) => ({...s, activeLang: String(value)}));
  }

  protected setSectionDialogField(lang: string, field: 'title' | 'description', value: string): void {
    this.sectionDialog.update((s) => ({
      ...s,
      translations: {
        ...s.translations,
        [lang]: {...(s.translations[lang] ?? {}), [field]: value},
      },
    }));
  }

  protected setSectionDialogPublished(value: boolean): void {
    this.sectionDialog.update((s) => ({...s, isPublished: value}));
  }

  protected submitSectionDialog(): void {
    const state = this.sectionDialog();
    const primary = this.primaryLang();
    const primaryTitle = (state.translations[primary]?.['title'] ?? '').trim();
    if (!primaryTitle) {
      this.toast.add({severity: 'warn', summary: this.ui().titleRequiredToast});
      this.sectionDialog.update((s) => ({...s, activeLang: primary}));
      return;
    }
    const translations: TranslationsMap = {};
    for (const lang of this.languages()) {
      translations[lang] = {
        title: (state.translations[lang]?.['title'] ?? '').trim(),
        description: state.translations[lang]?.['description'] ?? '',
      };
    }
    this.sectionDialog.update((s) => ({...s, submitting: true}));
    if (state.id === null) {
      this.catalog
        .createSection({
          course: this.courseId(),
          is_published: state.isPublished,
          order: this.sections().length,
          translations,
        })
        .subscribe({
          next: () => {
            this.sectionDialog.update((s) => ({...s, visible: false, submitting: false}));
            this.toast.add({severity: 'success', summary: this.ui().sectionCreatedToast});
            this.changed.emit();
          },
          error: (err: unknown) => {
            logApiError('lms.structure.create-section', err);
            this.sectionDialog.update((s) => ({...s, submitting: false}));
            this.toast.addApiError(err, this.ui().actionFailedToast);
          },
        });
    } else {
      this.catalog
        .updateSection(state.id, {is_published: state.isPublished, translations})
        .subscribe({
          next: () => {
            this.sectionDialog.update((s) => ({...s, visible: false, submitting: false}));
            this.toast.add({severity: 'success', summary: this.ui().sectionUpdatedToast});
            this.changed.emit();
          },
          error: (err: unknown) => {
            logApiError('lms.structure.update-section', err);
            this.sectionDialog.update((s) => ({...s, submitting: false}));
            this.toast.addApiError(err, this.ui().actionFailedToast);
          },
        });
    }
  }

  /**
   * Auto-fill blank section translations in the OTHER language tabs by
   * translating from the currently-active tab. Mirrors the
   * ``info-tab`` / ``course-create`` rule: title is translated as plain
   * text, description as HTML, and existing non-empty values are never
   * overwritten.
   */
  protected async translateSectionFromActiveTab(): Promise<void> {
    const state = this.sectionDialog();
    const source = state.activeLang;
    const langs = this.languages();
    if (!source || !langs.includes(source)) {
      return;
    }

    const sourceTitle = state.translations[source]?.['title'] ?? '';
    const sourceDescription = state.translations[source]?.['description'] ?? '';

    this.translating.set('section');
    try {
      for (const target of langs) {
        if (target === source) {
          continue;
        }
        const targetRow = this.sectionDialog().translations[target] ?? {};
        const needTitle = !(targetRow['title'] ?? '').trim();
        const needDesc = isEmptyRichText(targetRow['description'] ?? '');

        const items: TranslateBatchItem[] = [];
        if (needTitle) items.push({key: 'title', text: sourceTitle, format: 'text'});
        if (needDesc) items.push({key: 'description', text: sourceDescription, format: 'html'});

        if (!items.length) {
          continue;
        }

        const out = await this.translator.translateBatch(source, target, items);
        this.sectionDialog.update((s) => {
          const existing = s.translations[target] ?? {};
          const next: Record<string, string> = {...existing};
          if (needTitle && out['title'] !== undefined) {
            next['title'] = out['title'];
          }
          if (needDesc && out['description'] !== undefined) {
            next['description'] = out['description'];
          }
          return {
            ...s,
            translations: {...s.translations, [target]: next},
          };
        });
      }
    } catch (err) {
      logApiError('lms.structure.translate-section', err);
      this.toast.add({
        severity: 'error',
        summary: userFacingApiMessage(err, this.ui().sectionDialog.translationFailed),
      });
    } finally {
      this.translating.set(null);
    }
  }

  // -- Lesson dialog -------------------------------------------------------

  protected openLessonDialogCreate(section: SectionDto): void {
    const langs = this.languages();
    const blank: TranslationsMap = {};
    for (const code of langs) {
      blank[code] = {title: ''};
    }
    this.lessonDialog.set({
      visible: true,
      id: null,
      sectionId: section.id,
      isPublished: false,
      isPreview: false,
      translations: blank,
      activeLang: this.primaryLang(),
      submitting: false,
    });
  }

  protected openLessonDialogEdit(section: SectionDto, lesson: LessonDetailDto): void {
    const langs = this.languages();
    const tr: TranslationsMap = {};
    for (const code of langs) {
      const row = lesson.translations?.[code];
      tr[code] = {title: row?.['title'] ?? ''};
    }
    this.lessonDialog.set({
      visible: true,
      id: lesson.id,
      sectionId: section.id,
      isPublished: lesson.is_published ?? false,
      isPreview: lesson.is_preview ?? false,
      translations: tr,
      activeLang: this.primaryLang(),
      submitting: false,
    });
  }

  protected closeLessonDialog(): void {
    this.lessonDialog.update((s) => ({...s, visible: false, submitting: false}));
  }

  protected onLessonDialogTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    this.lessonDialog.update((s) => ({...s, activeLang: String(value)}));
  }

  protected setLessonDialogTitle(lang: string, value: string): void {
    this.lessonDialog.update((s) => ({
      ...s,
      translations: {
        ...s.translations,
        [lang]: {...(s.translations[lang] ?? {}), title: value},
      },
    }));
  }

  protected setLessonDialogPublished(value: boolean): void {
    this.lessonDialog.update((s) => ({...s, isPublished: value}));
  }

  protected setLessonDialogPreview(value: boolean): void {
    this.lessonDialog.update((s) => ({...s, isPreview: value}));
  }

  protected submitLessonDialog(): void {
    const state = this.lessonDialog();
    const primary = this.primaryLang();
    const primaryTitle = (state.translations[primary]?.['title'] ?? '').trim();
    if (!primaryTitle) {
      this.toast.add({severity: 'warn', summary: this.ui().titleRequiredToast});
      this.lessonDialog.update((s) => ({...s, activeLang: primary}));
      return;
    }
    const translations: TranslationsMap = {};
    for (const lang of this.languages()) {
      translations[lang] = {
        title: (state.translations[lang]?.['title'] ?? '').trim(),
      };
    }

    this.lessonDialog.update((s) => ({...s, submitting: true}));

    if (state.id === null) {
      // Derive slug from the effective-language title; fall back to a
      // unique timestamped value when slugify swallows everything
      // (pure-punctuation / non-Latin titles).
      let slug = slugify(primaryTitle);
      if (!slug) {
        slug = `lesson-${Date.now().toString(36)}`;
      }
      // Determine order from the existing lessons on the target section.
      const targetSection = this.sections().find((s) => s.id === state.sectionId);
      const order = targetSection ? this.sortedLessons(targetSection).length : 0;

      this.catalog
        .createLesson({
          section: state.sectionId,
          slug,
          order,
          is_published: state.isPublished,
          is_preview: state.isPreview,
          translations,
        })
        .subscribe({
          next: () => {
            this.lessonDialog.update((s) => ({...s, visible: false, submitting: false}));
            this.toast.add({severity: 'success', summary: this.ui().lessonCreatedToast});
            this.changed.emit();
          },
          error: (err: unknown) => {
            logApiError('lms.structure.create-lesson', err);
            this.lessonDialog.update((s) => ({...s, submitting: false}));
            this.toast.addApiError(err, this.ui().actionFailedToast);
          },
        });
    } else {
      this.catalog
        .updateLesson(state.id, {
          is_published: state.isPublished,
          is_preview: state.isPreview,
          translations,
        })
        .subscribe({
          next: () => {
            this.lessonDialog.update((s) => ({...s, visible: false, submitting: false}));
            this.toast.add({severity: 'success', summary: this.ui().lessonUpdatedToast});
            this.changed.emit();
          },
          error: (err: unknown) => {
            logApiError('lms.structure.update-lesson', err);
            this.lessonDialog.update((s) => ({...s, submitting: false}));
            this.toast.addApiError(err, this.ui().actionFailedToast);
          },
        });
    }
  }

  /**
   * Auto-fill blank lesson titles in the OTHER language tabs by
   * translating from the currently-active tab. Only ``title`` is
   * translatable in the lesson dialog (description / content blocks
   * live on the lesson edit page).
   */
  protected async translateLessonFromActiveTab(): Promise<void> {
    const state = this.lessonDialog();
    const source = state.activeLang;
    const langs = this.languages();
    if (!source || !langs.includes(source)) {
      return;
    }

    const sourceTitle = state.translations[source]?.['title'] ?? '';

    this.translating.set('lesson');
    try {
      for (const target of langs) {
        if (target === source) {
          continue;
        }
        const targetRow = this.lessonDialog().translations[target] ?? {};
        const needTitle = !(targetRow['title'] ?? '').trim();
        if (!needTitle) {
          continue;
        }

        const items: TranslateBatchItem[] = [
          {key: 'title', text: sourceTitle, format: 'text'},
        ];

        const out = await this.translator.translateBatch(source, target, items);
        if (out['title'] === undefined) {
          continue;
        }
        this.lessonDialog.update((s) => {
          const existing = s.translations[target] ?? {};
          return {
            ...s,
            translations: {
              ...s.translations,
              [target]: {...existing, title: out['title']},
            },
          };
        });
      }
    } catch (err) {
      logApiError('lms.structure.translate-lesson', err);
      this.toast.add({
        severity: 'error',
        summary: userFacingApiMessage(err, this.ui().lessonDialog.translationFailed),
      });
    } finally {
      this.translating.set(null);
    }
  }

  // -- Inline toggles ------------------------------------------------------

  protected toggleSectionPublished(section: SectionDto): void {
    this.catalog
      .updateSection(section.id, {is_published: !(section.is_published ?? false)})
      .subscribe({
        next: () => this.changed.emit(),
        error: (err: unknown) => {
          logApiError('lms.structure.toggle-section-published', err);
          this.toast.addApiError(err, this.ui().actionFailedToast);
        },
      });
  }

  protected toggleLessonPublished(lesson: LessonDetailDto): void {
    this.catalog
      .updateLesson(lesson.id, {is_published: !(lesson.is_published ?? false)})
      .subscribe({
        next: () => this.changed.emit(),
        error: (err: unknown) => {
          logApiError('lms.structure.toggle-lesson-published', err);
          this.toast.addApiError(err, this.ui().actionFailedToast);
        },
      });
  }

  protected toggleLessonPreview(lesson: LessonDetailDto): void {
    this.catalog
      .updateLesson(lesson.id, {is_preview: !(lesson.is_preview ?? false)})
      .subscribe({
        next: () => this.changed.emit(),
        error: (err: unknown) => {
          logApiError('lms.structure.toggle-lesson-preview', err);
          this.toast.addApiError(err, this.ui().actionFailedToast);
        },
      });
  }

  // -- Delete with confirm -------------------------------------------------

  protected confirmDeleteSection(section: SectionDto): void {
    const title = this.sectionTitle(section);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.confirmDeleteHeader,
      message: labels.confirmDeleteSection(title),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmAccept,
      rejectLabel: labels.confirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSection(section.id),
    });
  }

  protected confirmDeleteLesson(lesson: LessonDetailDto): void {
    const title = this.lessonTitle(lesson);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.confirmDeleteHeader,
      message: labels.confirmDeleteLesson(title),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmAccept,
      rejectLabel: labels.confirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLesson(lesson.id),
    });
  }

  private deleteSection(id: number): void {
    this.catalog.deleteSection(id).subscribe({
      next: () => {
        this.toast.add({severity: 'success', summary: this.ui().sectionDeletedToast});
        this.changed.emit();
      },
      error: (err: unknown) => {
        logApiError('lms.structure.delete-section', err);
        this.toast.addApiError(err, this.ui().actionFailedToast);
      },
    });
  }

  private deleteLesson(id: number): void {
    this.catalog.deleteLesson(id).subscribe({
      next: () => {
        this.toast.add({severity: 'success', summary: this.ui().lessonDeletedToast});
        this.changed.emit();
      },
      error: (err: unknown) => {
        logApiError('lms.structure.delete-lesson', err);
        this.toast.addApiError(err, this.ui().actionFailedToast);
      },
    });
  }

  // -- Drag & drop reorder -------------------------------------------------

  protected onSectionDrop(event: CdkDragDrop<SectionDto[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const list = [...this.sections()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const ids = list.map((s) => s.id);
    this.catalog.reorderSections(this.courseId(), ids).subscribe({
      next: () => {
        this.toast.add({severity: 'success', summary: this.ui().reorderSuccessToast});
        this.changed.emit();
      },
      error: (err: unknown) => {
        logApiError('lms.structure.reorder-sections', err);
        this.toast.addApiError(err, this.ui().actionFailedToast);
        // Re-fetch to restore the canonical order on failure.
        this.changed.emit();
      },
    });
  }

  protected onLessonDrop(section: SectionDto, event: CdkDragDrop<LessonDetailDto[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const list = this.sortedLessons(section);
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const ids = list.map((l) => l.id);
    this.catalog.reorderLessons(section.id, ids).subscribe({
      next: () => {
        this.toast.add({severity: 'success', summary: this.ui().reorderSuccessToast});
        this.changed.emit();
      },
      error: (err: unknown) => {
        logApiError('lms.structure.reorder-lessons', err);
        this.toast.addApiError(err, this.ui().actionFailedToast);
        this.changed.emit();
      },
    });
  }

  // -- Navigation ----------------------------------------------------------

  protected editLessonContent(lesson: LessonDetailDto): void {
    this.router.navigateByUrl(LMS_LESSON_EDIT(lesson.id));
  }
}
