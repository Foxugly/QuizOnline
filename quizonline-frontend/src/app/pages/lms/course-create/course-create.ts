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

import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {EnrollmentModeEnumDto} from '../../../api/generated/model/enrollment-mode-enum';
import {LevelEnumDto} from '../../../api/generated/model/level-enum';

import {LMS_CATALOG, LMS_COURSE_DETAIL} from '../../../app.routes-paths';
import {DomainOption, DomainService} from '../../../services/domain/domain';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {
  LangCode,
  TranslateBatchItem,
  TranslationService,
  isLangCode,
} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../shared/html/is-empty-rich-text';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {AppToastService} from '../../../shared/toast/app-toast.service';

import {getLmsCourseCreateUiText} from './course-create.i18n';

/** Per-language translation group for a Course: matches the backend ``Course`` model translated fields. */
type CourseLangGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  learning_objectives: FormControl<string>;
}>;

/** Snake-case slug constraint mirrored from Django's slug validator. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Component({
  selector: 'app-lms-course-create',
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
export class LmsCourseCreate implements OnInit {
  // ---- DI ------------------------------------------------------------------

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly domainService = inject(DomainService);
  private readonly catalog = inject(LmsCatalogService);
  private readonly translator = inject(TranslationService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.editor;
  protected readonly pageText = this.uiSvc.localized(getLmsCourseCreateUiText);
  protected readonly lmsCommon = this.uiSvc.localized(getLmsCommonUiText);

  // ---- State signals -------------------------------------------------------

  protected readonly loading = signal(true);
  protected readonly translating = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);

  /** Full domain list filtered to those the user can manage (owner or manager / superuser). */
  protected readonly manageableDomains = signal<DomainReadDto[]>([]);
  /** Allowed languages of the currently selected domain, sourced from the domain detail endpoint. */
  protected readonly domainLangs = signal<LangCode[]>([]);
  protected readonly activeTab = signal<LangCode | undefined>(undefined);

  /** Helper for ``DomainReadDto`` resolution: derived per-locale name. */
  protected readonly currentLang = this.userService.lang;

  protected readonly domainOptions = computed<DomainOption[]>(() => {
    const lang = this.currentLang();
    return this.manageableDomains().map((d) => ({
      id: d.id,
      name: getLocalizedDomainName(d, lang),
    }));
  });

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

  protected readonly primaryLanguageOptions = computed(() =>
    this.domainLangs().map((code) => ({value: code, label: code.toUpperCase()})),
  );

  // ---- Form ---------------------------------------------------------------

  protected readonly form = this.fb.group({
    domain: this.fb.control<number | null>(null, {validators: [Validators.required]}),
    slug: this.fb.control<string>('', {
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), Validators.maxLength(80)],
    }),
    level: this.fb.control<LevelEnumDto>(LevelEnumDto.Beginner, {validators: [Validators.required]}),
    language_code: this.fb.control<string>('', {validators: [Validators.required]}),
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
    this.loadDomains();

    // React to domain change: fetch the domain detail to know its allowed
    // languages, rebuild the translation tabs, and pick a sensible default
    // primary language.
    this.form.controls.domain.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.resetDomainState();
        if (typeof id !== 'number' || id <= 0) {
          return;
        }
        this.loadDomainDetail(id);
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
      logApiError('lms.course-create.translate', err);
      this.submitError.set(userFacingApiMessage(err, this.pageText().errors.translationFailed));
    } finally {
      this.translating.set(false);
    }
  }

  protected submit(): void {
    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }

    const codes = this.domainLangs();
    if (!codes.length) {
      this.submitError.set(this.pageText().errors.formInvalid);
      return;
    }

    const primary = this.form.controls.language_code.value;
    if (!primary || !codes.includes(primary as LangCode)) {
      this.submitError.set(this.pageText().errors.missingPrimaryLanguage);
      return;
    }

    // Backend ``CourseWriteSerializer`` runs ``full_clean()`` which requires a
    // non-empty ``title`` for the primary language. Surface this as a
    // friendlier error than the generic validation message.
    const primaryGroup = this.langGroup(primary);
    if (!(primaryGroup.controls.title.value ?? '').trim()) {
      this.submitError.set(this.pageText().errors.titleRequired);
      return;
    }

    const payload = this.buildPayload(codes);

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
            this.router.navigateByUrl(LMS_COURSE_DETAIL(created.slug));
          } else {
            this.router.navigateByUrl(LMS_CATALOG);
          }
        },
        error: (err) => {
          logApiError('lms.course-create.submit', err);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.saveFailed));
        },
      });
  }

  protected cancel(): void {
    this.router.navigateByUrl(LMS_CATALOG);
  }

  // ---- Internals ----------------------------------------------------------

  private translationsGroup(): FormGroup {
    return this.form.controls.translations;
  }

  private createCourseLangGroup(): CourseLangGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
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

  private resetDomainState(): void {
    this.domainLangs.set([]);
    this.activeTab.set(undefined);
    this.form.controls.language_code.setValue('', {emitEvent: false});
    const tg = this.translationsGroup();
    for (const key of Object.keys(tg.controls)) {
      tg.removeControl(key);
    }
  }

  private loadDomains(): void {
    this.loading.set(true);
    this.domainService
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError((err) => {
          logApiError('lms.course-create.load-domains', err);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.loadFailed));
          return EMPTY;
        }),
      )
      .subscribe((domains) => {
        const manageable = (domains ?? []).filter((d) => this.canManage(d));
        this.manageableDomains.set(manageable);

        // Preselect a sensible default: the user's ``current_domain`` if
        // they can manage it, otherwise the first manageable domain.
        const currentDomainId = this.userService.currentUser()?.current_domain ?? 0;
        const preferred =
          (currentDomainId > 0 && manageable.find((d) => d.id === currentDomainId)) ||
          manageable[0];
        if (preferred) {
          this.form.controls.domain.setValue(preferred.id);
        } else {
          // No manageable domain: surface a clear error and disable submit.
          this.submitError.set(this.pageText().errors.notInstructorOfAnyDomain);
        }
      });
  }

  private loadDomainDetail(id: number): void {
    this.loading.set(true);
    this.domainService
      .detail(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError((err) => {
          logApiError('lms.course-create.load-domain-detail', err);
          this.submitError.set(userFacingApiMessage(err, this.pageText().errors.loadFailed));
          return EMPTY;
        }),
      )
      .subscribe((domain: DomainDetailDto) => {
        const codes = this.extractLangCodes(domain);
        this.domainLangs.set(codes);
        this.syncTranslationControls(codes);

        // Pick the primary language: user lang if allowed, else first code.
        const userLang = this.userService.currentLang;
        const primary = codes.includes(userLang as LangCode) ? (userLang as LangCode) : codes[0];
        if (primary) {
          this.form.controls.language_code.setValue(primary);
          this.activeTab.set(primary);
        }
      });
  }

  private extractLangCodes(domain: Pick<DomainDetailDto, 'allowed_languages'>): LangCode[] {
    return (domain.allowed_languages ?? [])
      .filter((l) => l.active)
      .map((l) => l.code)
      .filter(isLangCode);
  }

  private canManage(domain: DomainReadDto): boolean {
    const me = this.userService.currentUser();
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return domain.owner?.id === me.id || (domain.managers ?? []).some((u) => u.id === me.id);
  }

  private buildPayload(codes: readonly LangCode[]): Record<string, unknown> {
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
      domain: v.domain,
      slug: (v.slug ?? '').trim(),
      level: v.level,
      language_code: v.language_code,
      enrollment_mode: v.enrollment_mode,
      translations,
    };
  }

}
