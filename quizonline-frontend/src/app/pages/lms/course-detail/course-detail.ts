import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {Subscription} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {TagModule} from 'primeng/tag';

import {LMS_COURSE_EDIT, LMS_LESSON_VIEW} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {pickTranslation, type TranslationsMap} from '../../../shared/lms/lms-translations';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';
import {UserService} from '../../../services/user/user';

import {getLmsCourseDetailUiText} from './course-detail.i18n';

interface CourseLessonDto {
  id: number;
  is_preview?: boolean;
  translations?: TranslationsMap;
}

interface CourseSectionDto {
  id: number;
  translations?: TranslationsMap;
  lessons?: CourseLessonDto[];
}

interface CourseDetailDto {
  id: number;
  slug: string;
  enrollment_mode?: 'open' | 'approval' | 'invite';
  can_manage?: boolean;
  translations?: TranslationsMap;
  sections?: CourseSectionDto[];
}

interface LessonVm {
  id: number;
  title: string;
  isPreview: boolean;
  href: ReturnType<typeof LMS_LESSON_VIEW>;
}

interface SectionVm {
  id: number;
  title: string;
  lessons: LessonVm[];
}

@Component({
  selector: 'app-lms-course-detail',
  imports: [RouterLink, ButtonModule, ProgressBarModule, TagModule, EmptyStateComponent],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(LmsCatalogService);
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly uiSvc = inject(UiTextService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly ui = this.uiSvc.localized(getLmsCourseDetailUiText);
  protected readonly currentLang = this.userService.lang;
  protected readonly course = signal<CourseDetailDto | null>(null);
  protected readonly enrolling = signal(false);

  private routeSub: Subscription | null = null;

  protected readonly courseTitle = computed(() =>
    pickTranslation(this.course()?.translations, this.currentLang(), 'title'),
  );

  /** Description is HTML produced by the rich-text editor; backend
   *  sanitizes it via nh3 on write, so we can trust it for innerHTML. */
  protected readonly courseDescription = computed<SafeHtml>(() => {
    const html = pickTranslation(this.course()?.translations, this.currentLang(), 'description');
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  });

  protected readonly hasDescription = computed(
    () => !!pickTranslation(this.course()?.translations, this.currentLang(), 'description')?.trim(),
  );

  protected readonly courseLearningObjectives = computed<SafeHtml>(() => {
    const html = pickTranslation(this.course()?.translations, this.currentLang(), 'learning_objectives');
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  });

  protected readonly hasLearningObjectives = computed(
    () =>
      !!pickTranslation(this.course()?.translations, this.currentLang(), 'learning_objectives')?.trim(),
  );

  protected readonly canManage = computed(() => !!this.course()?.can_manage);

  protected readonly editHref = computed(() => {
    const c = this.course();
    return c ? LMS_COURSE_EDIT(c.id) : null;
  });

  protected readonly sectionsVm = computed<SectionVm[]>(() => {
    const lang = this.currentLang();
    const sections = this.course()?.sections ?? [];
    return sections.map((s) => ({
      id: s.id,
      title: pickTranslation(s.translations, lang, 'title'),
      lessons: (s.lessons ?? []).map<LessonVm>((l) => ({
        id: l.id,
        title: pickTranslation(l.translations, lang, 'title'),
        isPreview: !!l.is_preview,
        href: LMS_LESSON_VIEW(l.id),
      })),
    }));
  });

  protected readonly hasAnyContent = computed(() => {
    const sections = this.sectionsVm();
    return sections.some((s) => s.lessons.length > 0);
  });

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.course.set(null);
        return;
      }
      this.loadBySlug(slug);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  protected enroll(): void {
    const current = this.course();
    if (!current || this.enrolling()) {
      return;
    }
    this.enrolling.set(true);
    this.enrollment.enroll(current.id).subscribe({
      next: () => {
        this.toast.add({severity: 'success', summary: this.ui().enrollSuccessToast});
        this.loadBySlug(current.slug);
      },
      error: (err: unknown) => {
        logApiError('lms.course-detail.enroll', err);
        this.toast.addApiError(err, this.ui().enrollErrorToast);
      },
      complete: () => this.enrolling.set(false),
    });
  }

  private loadBySlug(slug: string): void {
    this.catalog.detailBySlug(slug).subscribe({
      next: (detail) => this.course.set(detail as CourseDetailDto),
      error: (err: unknown) => {
        logApiError('lms.course-detail.load', err);
        this.course.set(null);
      },
    });
  }
}
