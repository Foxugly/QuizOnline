import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {TabsModule} from 'primeng/tabs';
import {TagModule} from 'primeng/tag';

import {LMS_CATALOG, LMS_COURSE_EDIT} from '../../../app.routes-paths';
import {CourseDetailDto} from '../../../api/generated/model/course-detail';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';

import {getLmsCourseEditUiText} from './course-edit.i18n';
import {LmsCourseEditInfoTab} from './tabs/info-tab/info-tab';
import {LmsCourseEditStructureTab} from './tabs/structure-tab/structure-tab';
import {LmsCourseEditEnrollmentTab} from './tabs/enrollment-tab/enrollment-tab';
import {LmsCourseEditAnalyticsTab} from './tabs/analytics-tab/analytics-tab';

/**
 * Course-author shell: four-tab page (info / structure / enrollment /
 * analytics) keyed off the ``:id`` route param. Each tab is its own
 * OnPush component receiving ``courseId`` as a signal-input, so the
 * shell stays trivially light and tab components can fan out into
 * full editors without coupling.
 *
 * The shell also owns the course-level publish/unpublish toggle in
 * the page header and fetches the course detail (used both to drive
 * that toggle's label and to expose a ``courseChanged`` callback to
 * child tabs that mutate sections / lessons — they emit and the shell
 * re-fetches so the publish button stays in sync with the live state).
 */
@Component({
  selector: 'app-lms-course-edit',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    TagModule,
    LmsCourseEditInfoTab,
    LmsCourseEditStructureTab,
    LmsCourseEditEnrollmentTab,
    LmsCourseEditAnalyticsTab,
  ],
  providers: [ConfirmationService],
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEdit implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(LmsCatalogService);
  private readonly toast = inject(AppToastService);
  private readonly confirmer = inject(ConfirmationService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getLmsCourseEditUiText);
  /** Editor-scoped UI dictionary, used for ``common.back`` on the header back button. */
  protected readonly editorUi = this.uiSvc.editor;
  protected readonly courseId = signal<number>(0);
  protected readonly course = signal<CourseDetailDto | null>(null);
  protected readonly loading = signal<boolean>(false);
  protected readonly publishing = signal<boolean>(false);
  protected readonly cloning = signal<boolean>(false);
  protected readonly deleting = signal<boolean>(false);

  /** True when the course is published — drives the publish/unpublish toggle. */
  protected readonly isPublished = computed(() => this.course()?.is_published === true);

  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const raw = params.get('id');
      const parsed = raw !== null ? Number(raw) : NaN;
      const id = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      this.courseId.set(id);
      if (id > 0) {
        this.refresh();
      } else {
        this.course.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  /**
   * Re-fetch the course detail. Bound to the ``changed`` output of
   * every child tab so mutations to sections / lessons trickle up and
   * refresh the publish button + downstream tabs uniformly.
   */
  protected refresh(): void {
    const id = this.courseId();
    if (id <= 0) {
      return;
    }
    this.loading.set(true);
    this.catalog.detailById(id).subscribe({
      next: (course) => {
        this.course.set(course as CourseDetailDto);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('lms.course-edit.load', err);
        this.toast.addApiError(err, this.ui().loadErrorToast);
        this.loading.set(false);
      },
    });
  }

  /**
   * Open a confirm dialog before duplicating the course. On accept,
   * call the backend ``clone`` endpoint and route the user to the
   * editor of the freshly-created copy so they can rename / tweak it.
   */
  protected confirmClone(): void {
    const id = this.courseId();
    if (id <= 0 || this.cloning() || this.deleting()) {
      return;
    }
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.confirmCloneTitle,
      message: labels.confirmCloneMessage,
      icon: 'pi pi-copy',
      acceptLabel: labels.confirmCloneAccept,
      rejectLabel: labels.confirmCloneReject,
      accept: () => this.cloneCourse(),
    });
  }

  /**
   * Open a confirm dialog before permanently deleting the course.
   * Message spells out the full cascade (sections / lessons / blocks /
   * enrollments / progress) so course authors cannot mistake this for
   * a soft-delete or an "unpublish".
   */
  protected confirmDelete(): void {
    const id = this.courseId();
    if (id <= 0 || this.cloning() || this.deleting()) {
      return;
    }
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.confirmDeleteTitle,
      message: labels.confirmDeleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmDeleteAccept,
      rejectLabel: labels.confirmDeleteReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteCourse(),
    });
  }

  private cloneCourse(): void {
    const id = this.courseId();
    if (id <= 0) {
      return;
    }
    this.cloning.set(true);
    this.catalog.clone(id).subscribe({
      next: (created) => {
        this.cloning.set(false);
        const newId = (created as {id?: number} | null)?.id;
        this.toast.add({severity: 'success', summary: this.ui().cloneSuccessToast});
        if (typeof newId === 'number' && newId > 0) {
          this.router.navigateByUrl(LMS_COURSE_EDIT(newId));
        }
      },
      error: (err: unknown) => {
        this.cloning.set(false);
        logApiError('lms.course-edit.clone', err);
        this.toast.addApiError(err, this.ui().cloneErrorToast);
      },
    });
  }

  private deleteCourse(): void {
    const id = this.courseId();
    if (id <= 0) {
      return;
    }
    this.deleting.set(true);
    this.catalog.deleteCourse(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.add({severity: 'success', summary: this.ui().deleteSuccessToast});
        this.router.navigateByUrl(LMS_CATALOG);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        logApiError('lms.course-edit.delete', err);
        // ``Certificate.course`` is ``on_delete=PROTECT`` so a course
        // that already issued certificates cannot be deleted. The
        // backend surfaces a ProtectedError → 4xx; we map that case
        // to a more useful fallback than the generic delete error.
        const status = (err as {status?: number} | null)?.status;
        const fallback =
          status === 409 || status === 400 || status === 403
            ? this.ui().deleteProtectedToast
            : this.ui().deleteErrorToast;
        this.toast.addApiError(err, fallback);
      },
    });
  }

  /** Navigate back to the LMS catalog list (same destination as the cancel flow on course-create). */
  protected back(): void {
    this.router.navigateByUrl(LMS_CATALOG);
  }

  protected togglePublish(): void {
    const id = this.courseId();
    if (id <= 0 || this.publishing()) {
      return;
    }
    const wasPublished = this.isPublished();
    this.publishing.set(true);
    const op$ = wasPublished ? this.catalog.unpublish(id) : this.catalog.publish(id);
    op$.subscribe({
      next: () => {
        this.publishing.set(false);
        this.toast.add({
          severity: 'success',
          summary: wasPublished
            ? this.ui().unpublishSuccessToast
            : this.ui().publishSuccessToast,
        });
        this.refresh();
      },
      error: (err: unknown) => {
        this.publishing.set(false);
        logApiError(
          wasPublished ? 'lms.course-edit.unpublish' : 'lms.course-edit.publish',
          err,
        );
        this.toast.addApiError(
          err,
          wasPublished ? this.ui().unpublishErrorToast : this.ui().publishErrorToast,
        );
      },
    });
  }
}
