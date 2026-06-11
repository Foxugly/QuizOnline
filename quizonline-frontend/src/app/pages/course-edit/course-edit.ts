import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {catchError, map, of, switchMap} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {TabsModule} from 'primeng/tabs';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {TooltipModule} from 'primeng/tooltip';

import {CATALOG, COURSE_DETAIL, COURSE_EDIT} from '../../app.routes-paths';
import {CourseDetailDto} from '../../api/generated/model/course-detail';
import {CatalogService} from '../../services/catalog/catalog.service';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {StatusBadgeComponent} from '../../shared/components/status-badge/status-badge';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {AppToastService} from '../../shared/toast/app-toast.service';

import {getCourseEditUiText} from './course-edit.i18n';
import {CourseEditInfoTab} from './tabs/info-tab/info-tab';
import {CourseEditStructureTab} from './tabs/structure-tab/structure-tab';
import {CourseEditEnrollmentTab} from './tabs/enrollment-tab/enrollment-tab';
import {CourseEditAnalyticsTab} from './tabs/analytics-tab/analytics-tab';

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
  selector: 'app-course-edit',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    ToggleSwitchModule,
    TooltipModule,
    PageHeader,
    StatusBadgeComponent,
    CourseEditInfoTab,
    CourseEditStructureTab,
    CourseEditEnrollmentTab,
    CourseEditAnalyticsTab,
  ],
  providers: [ConfirmationService],
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(AppToastService);
  private readonly confirmer = inject(ConfirmationService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getCourseEditUiText);
  /** Shell-scoped status vocabulary for ``<app-status-badge>``. */
  protected readonly shellUi = this.uiSvc.ui;
  /** Editor-scoped UI dictionary, used for ``common.back`` on the header back button. */
  protected readonly editorUi = this.uiSvc.editor;
  protected readonly courseId = signal<number>(0);
  protected readonly course = signal<CourseDetailDto | null>(null);
  /** Public learner-view URL for the current course. Drives the
   *  preview eye button in the page header — opens the same
   *  ``/course/<slug>`` route a regular learner would land on, so the
   *  author sees the rendered course exactly as the audience does. */
  protected readonly previewHref = computed(() => {
    const slug = this.course()?.slug;
    return slug ? COURSE_DETAIL(slug) : null;
  });
  protected readonly loading = signal<boolean>(false);
  protected readonly publishing = signal<boolean>(false);
  /** Local mirror driving the publish <p-toggleswitch>. Kept in sync with
   *  the server truth on every refresh, set optimistically on toggle, and
   *  reverted if the publish/unpublish call fails. */
  protected readonly publishToggle = signal<boolean>(false);
  protected readonly cloning = signal<boolean>(false);
  protected readonly deleting = signal<boolean>(false);

  ngOnInit(): void {
    // switchMap cancels the previous id's in-flight request when the route
    // param changes fast (clone → navigate reuses this component), so a stale
    // response can never overwrite the displayed course.
    this.route.paramMap
      .pipe(
        map((params) => {
          const raw = params.get('id');
          const parsed = raw !== null ? Number(raw) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        }),
        switchMap((id) => {
          this.courseId.set(id);
          if (id <= 0) {
            this.course.set(null);
            return of(null);
          }
          this.loading.set(true);
          // Catch inside switchMap so a failed load doesn't terminate the
          // outer paramMap stream — later route changes must still reload.
          return this.catalog.detailById(id).pipe(
            catchError((err: unknown) => {
              logApiError('lms.course-edit.load', err);
              this.toast.addApiError(err, this.ui().loadErrorToast);
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((course) => {
        if (course !== null) {
          this.course.set(course as CourseDetailDto);
          this.publishToggle.set((course as CourseDetailDto).is_published === true);
          this.loading.set(false);
        }
      });
  }

  /**
   * Imperative re-fetch of the course detail. Bound to the ``changed``
   * output of every child tab (and called after publish/unpublish) so
   * mutations to sections / lessons trickle up and refresh the publish
   * button + downstream tabs uniformly. Kept separate from the
   * param-driven load in ngOnInit, which is the only path that reacts
   * to route changes.
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
        this.publishToggle.set((course as CourseDetailDto).is_published === true);
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

  /** Download the course as a JSON file the operator can save and
   *  re-import later (same domain or another). The browser drives the
   *  download via a temporary blob URL — no extra dependency. */
  protected exportCourse(): void {
    const id = this.courseId();
    const slug = this.course()?.slug ?? `course-${id}`;
    if (id <= 0) {
      return;
    }
    this.catalog.exportCourse(id).subscribe({
      next: (payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast.add({severity: 'success', summary: this.ui().exportSuccessToast});
      },
      error: (err: unknown) => {
        logApiError('lms.course-edit.export', err);
        this.toast.addApiError(err, this.ui().exportErrorToast);
      },
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
          this.router.navigateByUrl(COURSE_EDIT(newId));
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
        this.router.navigateByUrl(CATALOG);
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
    this.router.navigateByUrl(CATALOG);
  }

  /**
   * Driven by the publish ``<p-toggleswitch>``. ``next`` is the desired
   * state. We mirror it optimistically into :member:`publishToggle` (so the
   * switch reflects the intent), then call the dedicated publish/unpublish
   * endpoint — which still enforces the "course needs published content"
   * pre-condition server-side. On failure we revert the switch and surface
   * the server's validation message via the error toast.
   */
  protected onPublishToggle(next: boolean): void {
    const id = this.courseId();
    if (id <= 0 || this.publishing()) {
      this.publishToggle.set(!next); // bail: keep the switch where it was
      return;
    }
    this.publishToggle.set(next);
    this.publishing.set(true);
    const op$ = next ? this.catalog.publish(id) : this.catalog.unpublish(id);
    op$.subscribe({
      next: () => {
        this.publishing.set(false);
        this.toast.add({
          severity: 'success',
          summary: next ? this.ui().publishSuccessToast : this.ui().unpublishSuccessToast,
        });
        this.refresh();
      },
      error: (err: unknown) => {
        this.publishing.set(false);
        this.publishToggle.set(!next); // revert — the operation did not happen
        logApiError(next ? 'lms.course-edit.publish' : 'lms.course-edit.unpublish', err);
        this.toast.addApiError(
          err,
          next ? this.ui().publishErrorToast : this.ui().unpublishErrorToast,
        );
      },
    });
  }
}
