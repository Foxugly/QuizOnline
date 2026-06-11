import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {finalize, map, of, switchMap} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {ProgressBarModule} from 'primeng/progressbar';
import {TagModule} from 'primeng/tag';
import {TooltipModule} from 'primeng/tooltip';

import {CATALOG, COURSE_EDIT, LESSON_VIEW} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {LoadingSkeleton} from '../../shared/components/loading-skeleton/loading-skeleton';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {StatusBadgeComponent} from '../../shared/components/status-badge/status-badge';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {pickTranslation, type TranslationsMap} from '../../shared/learning/learning-translations';
import {AppToastService} from '../../shared/toast/app-toast.service';
import {CatalogService} from '../../services/catalog/catalog.service';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';
import {InvitationCountService} from '../../services/invitation/invitation-count.service';
import {UserService} from '../../services/user/user';

import {getCourseDetailUiText} from './course-detail.i18n';

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
  /** Publish state — drives the instructor-only draft/published tag
   *  shown under the page header. Members of an invite-only domain
   *  can land on this page (via a pending invite) on a still-published
   *  course; only instructors see the badge, since for learners the
   *  course is by definition published. */
  is_published?: boolean;
  translations?: TranslationsMap;
  sections?: CourseSectionDto[];
  my_enrollment?: {
    status: 'active' | 'pending' | 'completed' | 'cancelled';
    progress_percent: number;
    next_lesson_id: number | null;
  } | null;
  /** Token of the caller's pending invitation for this course, if any.
   *  Drives the "Accepter l'invitation" button on the header — when
   *  present, we replace the regular ``Enroll`` CTA with the accept
   *  affordance. */
  my_pending_invite?: {
    id: number;
    token: string;
    expires_at: string;
    inviter_display_name: string;
  } | null;
}

interface LessonVm {
  id: number;
  title: string;
  isPreview: boolean;
  href: ReturnType<typeof LESSON_VIEW>;
}

interface SectionVm {
  id: number;
  title: string;
  lessons: LessonVm[];
}

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, ButtonModule, MessageModule, ProgressBarModule, TagModule, TooltipModule, EmptyStateComponent, LoadingSkeleton, PageHeader, StatusBadgeComponent],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = inject(CatalogService);
  private readonly enrollment = inject(EnrollmentService);
  private readonly invitationCount = inject(InvitationCountService);
  private readonly uiSvc = inject(UiTextService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly ui = this.uiSvc.localized(getCourseDetailUiText);
  /** Shell-scoped status / access vocabulary for ``<app-status-badge>``. */
  protected readonly shellUi = this.uiSvc.ui;
  /** Shared "Back" label served by the editor-scoped i18n dictionary. */
  protected readonly editorUi = this.uiSvc.editor;
  protected readonly catalogHref = CATALOG;
  protected readonly currentLang = this.userService.lang;
  protected readonly course = signal<CourseDetailDto | null>(null);
  protected readonly enrolling = signal(false);
  protected readonly acceptingInvite = signal(false);

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

  /** Drives the centered draft/published badge below the page header
   *  — shown only when the caller can manage the course (learners only
   *  see published rows, so a tag would be redundant for them). */
  protected readonly showStatusBadge = computed(() => this.canManage());

  protected readonly isPublished = computed(() => !!this.course()?.is_published);

  /** Enrollment mode drives the access-mode badge next to the
   *  publish badge. ``null`` when the DTO has not loaded yet. */
  protected readonly accessMode = computed<'open' | 'approval' | 'invite' | null>(
    () => this.course()?.enrollment_mode ?? null,
  );

  protected readonly editHref = computed(() => {
    const c = this.course();
    return c ? COURSE_EDIT(c.id) : null;
  });

  /** True when the caller has an active or completed enrollment on
   *  this course. Pending and cancelled don't count: pending users
   *  still see the regular "Enroll" hint, cancelled users get the
   *  normal re-enroll flow. */
  protected readonly isEnrolled = computed(() => {
    const me = this.course()?.my_enrollment;
    return !!me && (me.status === 'active' || me.status === 'completed');
  });

  /** Resume-on lesson route — points at the first uncompleted lesson
   *  served by the backend, or null when nothing is left (course
   *  complete) or when the user isn't enrolled. */
  /** Token of the caller's pending invitation for this course, or
   *  ``null`` when there is none. Drives the "Accept the invitation"
   *  button on the header. */
  protected readonly pendingInviteToken = computed<string | null>(
    () => this.course()?.my_pending_invite?.token ?? null,
  );

  /** Display name of the inviter — populates the "Invited by X"
   *  banner above the course content. ``null`` when there is no
   *  pending invitation. */
  protected readonly pendingInviteInviter = computed<string | null>(() => {
    const inv = this.course()?.my_pending_invite;
    return inv?.inviter_display_name?.trim() ? inv.inviter_display_name : null;
  });

  protected readonly continueHref = computed<string | null>(() => {
    const me = this.course()?.my_enrollment;
    if (!me || me.status === 'cancelled' || !me.next_lesson_id) {
      return null;
    }
    return LESSON_VIEW(me.next_lesson_id);
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
        href: LESSON_VIEW(l.id),
      })),
    }));
  });

  protected readonly hasAnyContent = computed(() => {
    const sections = this.sectionsVm();
    return sections.some((s) => s.lessons.length > 0);
  });

  ngOnInit(): void {
    // switchMap cancels the previous slug's in-flight request when the route
    // param changes fast (course→course navigation reuses this component), so
    // a stale response can never overwrite the displayed course.
    this.route.paramMap
      .pipe(
        map((params) => params.get('slug')),
        switchMap((slug) => {
          if (!slug) {
            this.course.set(null);
            return of(null);
          }
          return this.catalog.detailBySlug(slug);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          if (detail) {
            this.course.set(detail as CourseDetailDto);
          }
        },
        error: (err: unknown) => {
          logApiError('lms.course-detail.load', err);
          this.course.set(null);
        },
      });
  }

  protected enroll(): void {
    const current = this.course();
    if (!current || this.enrolling()) {
      return;
    }
    this.enrolling.set(true);
    this.enrollment
      .enroll(current.id)
      .pipe(finalize(() => this.enrolling.set(false)))
      .subscribe({
        next: () => {
          this.toast.add({severity: 'success', summary: this.ui().enrollSuccessToast});
          this.loadBySlug(current.slug);
        },
        error: (err: unknown) => {
          logApiError('lms.course-detail.enroll', err);
          this.toast.addApiError(err, this.ui().enrollErrorToast);
        },
      });
  }

  protected acceptInvite(): void {
    const current = this.course();
    const token = this.pendingInviteToken();
    if (!current || !token || this.acceptingInvite()) {
      return;
    }
    this.acceptingInvite.set(true);
    this.enrollment
      .acceptInviteByToken(token)
      .pipe(finalize(() => this.acceptingInvite.set(false)))
      .subscribe({
        next: () => {
          this.invitationCount.refresh();
          this.toast.add({severity: 'success', summary: this.ui().acceptInviteSuccessToast});
          // Re-fetch so my_enrollment / my_pending_invite refresh and
          // the header swaps the button for "Continue".
          this.loadBySlug(current.slug);
        },
        error: (err: unknown) => {
          logApiError('lms.course-detail.accept-invite', err);
          this.toast.addApiError(err, this.ui().acceptInviteErrorToast);
        },
      });
  }

  /** Imperative re-fetch after a mutation (enroll / accept-invite). The
   *  param-driven load goes through switchMap in ngOnInit; this path is only
   *  used to refresh my_enrollment / my_pending_invite on the current slug. */
  private loadBySlug(slug: string): void {
    this.catalog
      .detailBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.course.set(detail as CourseDetailDto),
        error: (err: unknown) => {
          logApiError('lms.course-detail.load', err);
          this.course.set(null);
        },
      });
  }
}
