import {CommonModule} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {Router} from '@angular/router';
import {of} from 'rxjs';
import {catchError} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {EditorModule} from 'primeng/editor';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {SelectModule} from 'primeng/select';
import {TabsModule} from 'primeng/tabs';

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {EnrollmentModeEnumDto} from '../../../../../api/generated/model/enrollment-mode-enum';
import {LevelEnumDto} from '../../../../../api/generated/model/level-enum';

import {LMS_CATALOG} from '../../../../../app.routes-paths';
import {LmsCatalogService} from '../../../../../services/lms/lms-catalog.service';
import {
  LangCode,
  TranslateBatchItem,
  TranslationService,
  isLangCode,
} from '../../../../../services/translation/translation';
import {logApiError, userFacingApiMessage} from '../../../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../../../shared/lms/lms-common.i18n';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {getLmsCourseEditInfoTabUiText} from './info-tab.i18n';

/**
 * Per-language translation group for a Course: matches the backend
 * ``Course`` model's translated fields. Identical shape to the create
 * page's ``CourseLangGroup`` — kept local so the two pages can evolve
 * independently without leaking a half-shared helper.
 */
type CourseLangGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  learning_objectives: FormControl<string>;
}>;

/**
 * ``CourseDetailDto.available_lang_codes`` is generated as ``string`` by
 * OpenAPI because the backend ``SerializerMethodField`` doesn't carry a
 * schema. The actual payload is ``string[]`` — narrowed here to keep
 * the call sites readable without touching the generated client.
 */
type CourseWithLangCodes = CourseDetailDto & {
  available_lang_codes: string[] | string;
};

/**
 * Editable "Information" tab of ``/lms/course/:id/edit``.
 *
 * Mirrors the recently-simplified ``course-create`` page but for an
 * existing course: the shell hands down the fetched ``CourseDetailDto``
 * and the tab seeds a ``FormGroup`` from it, exposes the same
 * primitive-metadata + per-language translation tabs surface, and
 * PATCHes the course on save. Slug / domain / primary language are
 * deliberately not editable here — changing them would break URLs and
 * (for ``language``) the immutable creation context of the course.
 *
 * Cover image follows the two-step pattern already used by the lesson
 * block editors (see :class:`LmsUploadService`): the form first PATCHes
 * the JSON fields, then — if the author picked a new file — a second
 * multipart PATCH replaces the image. Clearing the existing cover is
 * handled inline by sending ``cover_image: null`` in the first PATCH.
 */
@Component({
  selector: 'app-lms-course-edit-info-tab',
  templateUrl: './info-tab.html',
  styleUrl: './info-tab.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    EditorModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditInfoTab {
  // ---- DI ------------------------------------------------------------------

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly catalog = inject(LmsCatalogService);
  private readonly translator = inject(TranslationService);
  private readonly toast = inject(AppToastService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly editorText = this.uiSvc.editor;
  protected readonly pageText = this.uiSvc.localized(getLmsCourseEditInfoTabUiText);
  protected readonly lmsCommon = this.uiSvc.localized(getLmsCommonUiText);

  // ---- Inputs / outputs ---------------------------------------------------

  readonly courseId = input.required<number>();
  readonly course = input<CourseDetailDto | null>(null);
  readonly changed = output<void>();

  // ---- State signals -------------------------------------------------------

  protected readonly translating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);

  /** New cover file selected by the author (not yet uploaded). */
  protected readonly coverImageFile = signal<File | null>(null);

  /**
   * Tracks whether the author explicitly cleared the existing cover.
   * When true we send ``cover_image: null`` in the JSON PATCH so the
   * backend wipes the ``ImageField`` even if no new file was picked.
   */
  protected readonly coverImageCleared = signal(false);

  protected readonly activeTab = signal<LangCode | undefined>(undefined);

  /** Allowed translation languages for the course (mirrors structure tab). */
  protected readonly availableLangs = computed<LangCode[]>(() => {
    const c = this.course() as CourseWithLangCodes | null;
    if (!c) {
      return [];
    }
    const codes = c.available_lang_codes;
    const list: string[] = Array.isArray(codes)
      ? codes
      : typeof codes === 'string' && codes.length > 0
        ? codes.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    return list.filter(isLangCode);
  });

  /** Course primary language (``language_code``) — drives "title required" check. */
  protected readonly primaryLang = computed<LangCode | undefined>(() => {
    const c = this.course();
    if (!c?.language_code) {
      return undefined;
    }
    return isLangCode(c.language_code) ? c.language_code : undefined;
  });

  protected readonly currentCoverUrl = computed<string | null>(() => {
    if (this.coverImageCleared()) {
      return null;
    }
    return this.course()?.cover_image ?? null;
  });

  protected readonly levelChoices = computed(() => {
    const labels = this.lmsCommon().levelLabels;
    return [
      {value: LevelEnumDto.Beginner, label: labels.beginner},
      {value: LevelEnumDto.Intermediate, label: labels.intermediate},
      {value: LevelEnumDto.Advanced, label: labels.advanced},
    ];
  });

  protected readonly enrollmentChoices = computed(() => {
    const labels = this.pageText().enrollmentLabels;
    return [
      {value: EnrollmentModeEnumDto.Open, label: labels.open},
      {value: EnrollmentModeEnumDto.Approval, label: labels.approval},
      {value: EnrollmentModeEnumDto.Invite, label: labels.invite},
    ];
  });

  // ---- Form ---------------------------------------------------------------

  protected readonly form = this.fb.group({
    level: this.fb.control<LevelEnumDto>(LevelEnumDto.Beginner, {validators: [Validators.required]}),
    enrollment_mode: this.fb.control<EnrollmentModeEnumDto>(EnrollmentModeEnumDto.Open, {
      validators: [Validators.required],
    }),
    estimated_duration: this.fb.control<number>(0, {
      validators: [Validators.required, Validators.min(0)],
    }),
    translations: this.fb.group({}),
  });

  // ---- Effects ------------------------------------------------------------

  private lastToastMessage: string | null = null;
  private seededForCourseId: number | null = null;

  constructor() {
    // Seed the form once the parent shell hands down the fetched course.
    effect(() => {
      const c = this.course();
      if (!c) {
        return;
      }
      // Re-seed if the course id changes (e.g. navigating between two
      // ``/lms/course/:id/edit`` URLs without a full re-route) or after
      // a successful save triggers a re-fetch (the parent emits a fresh
      // ``CourseDetailDto`` instance — we compare by id to avoid
      // clobbering local edits on every signal tick).
      if (this.seededForCourseId === c.id) {
        return;
      }
      this.seededForCourseId = c.id;
      this.seedFromCourse(c);
    });

    effect(() => {
      const detail = this.submitError();
      if (!detail || detail === this.lastToastMessage) {
        return;
      }
      this.lastToastMessage = detail;
      this.toast.add({
        severity: 'error',
        summary: this.pageText().toasts.errorSummary,
        detail,
      });
    });
  }

  // ---- Public template API ------------------------------------------------

  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    const code = String(value);
    if (isLangCode(code) && this.availableLangs().includes(code)) {
      this.activeTab.set(code);
    }
  }

  protected langGroup(code: string): CourseLangGroup {
    const group = this.translationsGroup().get(code) as CourseLangGroup | null;
    if (!group) {
      throw new Error(`Missing translation group for language: ${code}`);
    }
    return group;
  }

  /**
   * Auto-fill missing translations in the other tabs by translating from
   * the currently-active tab. Only fills blanks, never overwrites.
   */
  protected async translateFromActiveTab(): Promise<void> {
    const source = this.activeTab();
    if (!source) {
      return;
    }
    await this.translateFrom(source);
  }

  protected async translateFrom(sourceLang: LangCode): Promise<void> {
    const codes = this.availableLangs();
    if (!codes.includes(sourceLang)) {
      return;
    }

    this.translating.set(true);
    this.submitError.set(null);

    try {
      const sourceGroup = this.langGroup(sourceLang);
      const sourceTitle = sourceGroup.controls.title.value ?? '';
      const sourceDescription = sourceGroup.controls.description.value ?? '';
      const sourceObjectives = sourceGroup.controls.learning_objectives.value ?? '';

      for (const target of codes) {
        if (target === sourceLang) {
          continue;
        }
        const targetGroup = this.langGroup(target);
        const titleCtrl = targetGroup.controls.title;
        const descCtrl = targetGroup.controls.description;
        const objCtrl = targetGroup.controls.learning_objectives;

        const needTitle = !(titleCtrl.value ?? '').trim();
        const needDesc = isEmptyRichText(descCtrl.value ?? '');
        const needObj = isEmptyRichText(objCtrl.value ?? '');

        const items: TranslateBatchItem[] = [];
        if (needTitle) items.push({key: 'title', text: sourceTitle, format: 'text'});
        if (needDesc) items.push({key: 'description', text: sourceDescription, format: 'html'});
        if (needObj) items.push({key: 'learning_objectives', text: sourceObjectives, format: 'html'});

        if (!items.length) {
          continue;
        }

        const out = await this.translator.translateBatch(sourceLang, target, items);
        if (needTitle && out['title'] !== undefined) {
          titleCtrl.setValue(out['title']);
          titleCtrl.markAsDirty();
        }
        if (needDesc && out['description'] !== undefined) {
          descCtrl.setValue(out['description']);
          descCtrl.markAsDirty();
        }
        if (needObj && out['learning_objectives'] !== undefined) {
          objCtrl.setValue(out['learning_objectives']);
          objCtrl.markAsDirty();
        }
      }
    } catch (err) {
      logApiError('lms.course-edit.info.translate', err);
      this.submitError.set(userFacingApiMessage(err, this.pageText().errors.translationFailed));
    } finally {
      this.translating.set(false);
    }
  }

  // ---- File picker --------------------------------------------------------

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.coverImageFile.set(file);
    // Picking a new file overrides any previous "clear" intent.
    if (file) {
      this.coverImageCleared.set(false);
    }
    // Reset the native input so re-selecting the same file fires ``change`` again.
    input.value = '';
  }

  protected clearSelectedFile(): void {
    this.coverImageFile.set(null);
  }

  protected removeCurrentCover(): void {
    this.coverImageFile.set(null);
    this.coverImageCleared.set(true);
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ---- Submit / cancel ----------------------------------------------------

  protected submit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }

    const primary = this.primaryLang();
    const codes = this.availableLangs();
    if (codes.length === 0) {
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }
    if (primary) {
      const primaryTitle = (this.langGroup(primary).controls.title.value ?? '').trim();
      if (!primaryTitle) {
        this.submitError.set(this.pageText().errors.titleRequired);
        // Focus the offending tab so the author lands on the empty field.
        this.activeTab.set(primary);
        return;
      }
    }

    const id = this.courseId();
    const payload = this.buildJsonPayload(codes);
    const pickedFile = this.coverImageFile();

    this.saving.set(true);
    this.catalog
      .updateCourse(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (!pickedFile) {
            this.finalizeSave();
            return;
          }
          this.catalog
            .uploadCourseCoverImage(id, pickedFile)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              catchError((err: unknown) => {
                logApiError('lms.course-edit.info.upload', err);
                this.saving.set(false);
                this.submitError.set(
                  userFacingApiMessage(err, this.pageText().errors.uploadFailed),
                );
                // Even though the upload failed the JSON PATCH already
                // succeeded — emit ``changed`` so the parent re-fetches
                // and the rest of the form reflects the saved state.
                this.changed.emit();
                return of(null);
              }),
            )
            .subscribe((res) => {
              if (res !== null) {
                this.finalizeSave();
              }
            });
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.info.save', err);
          this.saving.set(false);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.saveFailed));
        },
      });

  }

  protected cancel(): void {
    this.router.navigateByUrl(LMS_CATALOG);
  }

  // ---- Internals ----------------------------------------------------------

  private finalizeSave(): void {
    this.saving.set(false);
    this.coverImageFile.set(null);
    this.coverImageCleared.set(false);
    // Re-seed the form on the next ``course`` input emission.
    this.seededForCourseId = null;
    this.toast.add({
      severity: 'success',
      summary: this.pageText().toasts.saveSuccess,
    });
    this.changed.emit();
  }

  private translationsGroup(): FormGroup {
    return this.form.controls.translations;
  }

  private createCourseLangGroup(): CourseLangGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.maxLength(200)]),
      description: this.fb.control(''),
      learning_objectives: this.fb.control(''),
    }) as CourseLangGroup;
  }

  private syncTranslationControls(codes: readonly LangCode[]): void {
    const tg = this.translationsGroup();
    const wanted = new Set<string>(codes);
    for (const code of codes) {
      if (!tg.contains(code)) {
        tg.addControl(code, this.createCourseLangGroup());
      }
    }
    for (const key of Object.keys(tg.controls)) {
      if (!wanted.has(key)) {
        tg.removeControl(key);
      }
    }
  }

  /**
   * Apply the fetched ``CourseDetailDto`` to the local form: rebuild
   * the translations groups for the current ``available_lang_codes``,
   * patch in primitive fields, and align ``activeTab`` with the course
   * primary language. Called from an effect so the form refreshes
   * after every successful save (the parent re-fetches and a fresh
   * ``CourseDetailDto`` instance flows back in).
   */
  private seedFromCourse(course: CourseDetailDto): void {
    const codes = this.availableLangs();
    this.syncTranslationControls(codes);

    for (const code of codes) {
      const row = course.translations?.[code];
      this.langGroup(code).reset({
        title: row?.['title'] ?? '',
        description: row?.['description'] ?? '',
        learning_objectives: row?.['learning_objectives'] ?? '',
      });
    }

    this.form.patchValue({
      level: course.level ?? LevelEnumDto.Beginner,
      enrollment_mode: course.enrollment_mode ?? EnrollmentModeEnumDto.Open,
      estimated_duration: course.estimated_duration ?? 0,
    });
    this.form.markAsPristine();

    const primary = this.primaryLang();
    if (primary) {
      this.activeTab.set(primary);
    } else if (codes.length > 0) {
      this.activeTab.set(codes[0]);
    }
  }

  private buildJsonPayload(codes: readonly LangCode[]): Record<string, unknown> {
    const v = this.form.getRawValue();
    const translations: Record<string, Record<string, string>> = {};
    for (const code of codes) {
      const group = this.langGroup(code);
      translations[code] = {
        title: (group.controls.title.value ?? '').trim(),
        description: group.controls.description.value ?? '',
        learning_objectives: group.controls.learning_objectives.value ?? '',
      };
    }
    const payload: Record<string, unknown> = {
      level: v.level,
      enrollment_mode: v.enrollment_mode,
      estimated_duration: v.estimated_duration ?? 0,
      translations,
    };
    if (this.coverImageCleared() && !this.coverImageFile()) {
      payload['cover_image'] = null;
    }
    return payload;
  }
}
