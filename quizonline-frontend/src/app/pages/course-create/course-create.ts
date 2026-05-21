import {CommonModule} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
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
import {EMPTY, catchError, finalize} from 'rxjs';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {EditorModule} from 'primeng/editor';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {SelectModule} from 'primeng/select';
import {TabsModule} from 'primeng/tabs';

import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {EnrollmentModeEnumDto} from '../../api/generated/model/enrollment-mode-enum';
import {LevelEnumDto} from '../../api/generated/model/level-enum';

import {CATALOG, COURSE_DETAIL} from '../../app.routes-paths';
import {DomainService} from '../../services/domain/domain';
import {CatalogService} from '../../services/catalog/catalog.service';
import {
  LangCode,
  TranslateBatchItem,
  TranslationService,
  isLangCode,
} from '../../services/translation/translation';
import {UserService} from '../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../shared/api/api-errors';
import {isEmptyRichText} from '../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getLearningCommonUiText} from '../../shared/learning/learning-common.i18n';
import {AppToastService} from '../../shared/toast/app-toast.service';

import {getCourseCreateUiText} from './course-create.i18n';

/** Per-language translation group for a Course: matches the backend ``Course`` model translated fields. */
type CourseLangGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  learning_objectives: FormControl<string>;
}>;

/**
 * Inline slugify helper used at submit time to derive a slug from the
 * effective-language title. Mirrors the backend ``slug`` validator pattern
 * ``^[a-z0-9]+(?:-[a-z0-9]+)*$`` and the ``max_length=80`` constraint.
 */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Component({
  selector: 'app-course-create',
  templateUrl: './course-create.html',
  styleUrl: './course-create.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    EditorModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCreate implements OnInit {
  // ---- DI ------------------------------------------------------------------

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly domainService = inject(DomainService);
  private readonly catalog = inject(CatalogService);
  private readonly translator = inject(TranslationService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.editor;
  protected readonly pageText = this.uiSvc.localized(getCourseCreateUiText);
  protected readonly lmsCommon = this.uiSvc.localized(getLearningCommonUiText);

  // ---- State signals -------------------------------------------------------

  protected readonly loading = signal(true);
  protected readonly translating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);

  /** Resolved domain detail (the user's ``current_domain``). Null until loaded or if absent. */
  protected readonly currentDomain = signal<DomainDetailDto | null>(null);

  /** Allowed languages of the resolved domain. */
  protected readonly domainLangs = computed<LangCode[]>(() => {
    const domain = this.currentDomain();
    if (!domain) {
      return [];
    }
    return (domain.allowed_languages ?? [])
      .filter((l) => l.active)
      .map((l) => l.code)
      .filter(isLangCode);
  });

  /**
   * Effective language for the course: the user's UI language if it is
   * among the domain's allowed languages, otherwise the first allowed code.
   */
  protected readonly effectiveLang = computed<LangCode | undefined>(() => {
    const codes = this.domainLangs();
    if (codes.length === 0) {
      return undefined;
    }
    const userLang = this.userService.lang() as LangCode;
    return codes.includes(userLang) ? userLang : codes[0];
  });

  protected readonly activeTab = signal<LangCode | undefined>(undefined);

  /** Tracks whether the resolved current domain is manageable by the user (false also means "blocked"). */
  protected readonly notManageable = signal(false);

  /** ``LevelEnumDto`` options resolved against the shared LMS dictionary. */
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
    translations: this.fb.group({}),
  });

  // ---- Effects ------------------------------------------------------------

  private lastToastMessage: string | null = null;

  constructor() {
    effect(() => {
      const detail = this.submitError();
      if (!detail || detail === this.lastToastMessage) {
        return;
      }
      this.lastToastMessage = detail;
      this.toast.add({
        severity: 'error',
        summary: this.pageText().toastErrorSummary,
        detail,
      });
    });
  }

  ngOnInit(): void {
    const currentDomainId = this.userService.currentUser()?.current_domain ?? null;
    if (!currentDomainId || currentDomainId <= 0) {
      this.loading.set(false);
      this.notManageable.set(true);
      this.submitError.set(this.pageText().errors.noCurrentDomain);
      return;
    }

    this.domainService
      .detail(currentDomainId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError((err) => {
          logApiError('lms.course-create.load-domain-detail', err);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.loadFailed));
          this.notManageable.set(true);
          return EMPTY;
        }),
      )
      .subscribe((domain: DomainDetailDto) => {
        if (!this.canManage(domain)) {
          this.notManageable.set(true);
          this.submitError.set(this.pageText().errors.notInstructorOfCurrentDomain);
          return;
        }
        this.currentDomain.set(domain);
        const codes = this.domainLangs();
        this.syncTranslationControls(codes);
        const primary = this.effectiveLang();
        if (primary) {
          this.activeTab.set(primary);
        }
      });
  }

  // ---- Public template API ------------------------------------------------

  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    const code = String(value);
    if (isLangCode(code) && this.domainLangs().includes(code)) {
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
   * the currently-active tab. Mirrors the ``domain-create`` UX: only fills
   * blanks, never overwrites.
   */
  protected async translateFromActiveTab(): Promise<void> {
    const source = this.activeTab();
    if (!source) {
      return;
    }
    await this.translateFrom(source);
  }

  protected async translateFrom(sourceLang: LangCode): Promise<void> {
    const codes = this.domainLangs();
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

      // Fire every target-language ``translateBatch`` call in
      // parallel so the user waits one network round-trip total
      // instead of (n_langs - 1) sequential ones.
      const plans = codes.flatMap((target) => {
        if (target === sourceLang) {
          return [];
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
          return [];
        }
        return [{target, titleCtrl, descCtrl, objCtrl, needTitle, needDesc, needObj, items}];
      });

      const results = await Promise.all(
        plans.map((p) =>
          this.translator
            .translateBatch(sourceLang, p.target, p.items)
            .then((out) => ({plan: p, out})),
        ),
      );

      for (const {plan, out} of results) {
        if (plan.needTitle && out['title'] !== undefined) {
          plan.titleCtrl.setValue(out['title']);
          plan.titleCtrl.markAsDirty();
        }
        if (plan.needDesc && out['description'] !== undefined) {
          plan.descCtrl.setValue(out['description']);
          plan.descCtrl.markAsDirty();
        }
        if (plan.needObj && out['learning_objectives'] !== undefined) {
          plan.objCtrl.setValue(out['learning_objectives']);
          plan.objCtrl.markAsDirty();
        }
      }
    } catch (err) {
      logApiError('lms.course-create.translate', err);
      this.submitError.set(userFacingApiMessage(err, this.pageText().errors.translationFailed));
    } finally {
      this.translating.set(false);
    }
  }

  protected submit(): void {
    this.submitError.set(null);

    // Re-check domain + manageability invariants.
    const domain = this.currentDomain();
    if (!domain) {
      this.submitError.set(this.pageText().errors.noCurrentDomain);
      return;
    }
    if (!this.canManage(domain)) {
      this.submitError.set(this.pageText().errors.notInstructorOfCurrentDomain);
      return;
    }

    const primary = this.effectiveLang();
    const codes = this.domainLangs();
    if (!primary || codes.length === 0) {
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }

    // Title in the effective-language tab is mandatory (backend ``full_clean``).
    const primaryGroup = this.langGroup(primary);
    const primaryTitle = (primaryGroup.controls.title.value ?? '').trim();
    if (!primaryTitle) {
      this.submitError.set(this.pageText().errors.titleRequired);
      return;
    }

    // Auto-derive slug from the effective-language title.
    let slug = slugify(primaryTitle);
    if (!slug) {
      // Fallback for titles that slugify to an empty string (e.g. fully
      // non-Latin scripts or pure punctuation). Backend will accept it.
      slug = `course-${Date.now().toString(36)}`;
    }

    const payload = this.buildPayload(domain.id, slug, primary, codes);

    this.saving.set(true);
    this.catalog
      .create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.toast.add({
            severity: 'success',
            summary: this.pageText().toastSuccessSummary,
            detail: this.pageText().toastSuccessDetail,
          });
          if (created?.slug) {
            this.router.navigateByUrl(COURSE_DETAIL(created.slug));
          } else {
            this.router.navigateByUrl(CATALOG);
          }
        },
        error: (err) => {
          logApiError('lms.course-create.submit', err);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.saveFailed));
        },
      });
  }

  protected cancel(): void {
    this.router.navigateByUrl(CATALOG);
  }

  // ---- Internals ----------------------------------------------------------

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

  private canManage(domain: Pick<DomainDetailDto, 'owner' | 'managers'>): boolean {
    const me = this.userService.currentUser();
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return domain.owner?.id === me.id || (domain.managers ?? []).some((u) => u.id === me.id);
  }

  private buildPayload(
    domainId: number,
    slug: string,
    languageCode: LangCode,
    codes: readonly LangCode[],
  ): Record<string, unknown> {
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
    return {
      domain: domainId,
      slug,
      level: v.level,
      language_code: languageCode,
      enrollment_mode: v.enrollment_mode,
      translations,
    };
  }
}
