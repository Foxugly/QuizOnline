import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {Subject as RxSubject, debounceTime, forkJoin} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {PaginatorModule} from 'primeng/paginator';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {ConfirmationService} from 'primeng/api';

import {LMS_CATALOG, LMS_COURSE_DETAIL, LMS_COURSE_EDIT, LMS_COURSE_NEW} from '../../../app.routes-paths';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {DomainService} from '../../../services/domain/domain';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';
import {BulkActionOption, BulkActionsComponent} from '../../../shared/components/bulk-actions/bulk-actions';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {pickTranslation, type TranslationsMap} from '../../../shared/lms/lms-translations';
import {AppToastService} from '../../../shared/toast/app-toast.service';

import {getLmsCourseListUiText} from './course-list.i18n';

/** Course shape returned by ``GET /api/lms/course/`` — narrow subset
 *  of :class:`CourseListSerializer` fields the admin table actually
 *  consumes. ``unknown[]`` from :class:`LmsCatalogService.list` is
 *  narrowed at the call site. */
interface CourseListRowDto {
  id: number;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollment_mode: 'open' | 'approval' | 'invite';
  is_published: boolean;
  domain: number;
  translations?: TranslationsMap;
  lesson_count?: number;
}

interface CourseListRow {
  id: number;
  slug: string;
  title: string;
  domainName: string;
  domainId: number;
  levelLabel: string;
  enrollmentLabel: string;
  isPublished: boolean;
  statusLabel: string;
  lessonCount: number;
}

type BulkAction = 'publish' | 'unpublish' | 'delete';

@Component({
  selector: 'app-lms-course-list',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    PaginatorModule,
    TableModule,
    TagModule,
    BulkActionsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseList implements OnInit {
  private readonly catalog = inject(LmsCatalogService);
  private readonly domainService = inject(DomainService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput$ = new RxSubject<string>();

  readonly ui = inject(UiTextService).localized(getLmsCourseListUiText);
  readonly common = inject(UiTextService).localized(getLmsCommonUiText);
  readonly editorUi = inject(UiTextService).editor;
  private readonly currentLang = this.userService.lang;

  protected readonly catalogHref = LMS_CATALOG;
  protected readonly createCourseHref = LMS_COURSE_NEW;
  protected readonly rows = 10;

  protected readonly courses = signal<CourseListRowDto[]>([]);
  protected readonly domains = signal<DomainReadDto[]>([]);
  protected readonly q = signal('');
  protected readonly loading = signal(false);
  protected readonly selectedRows = signal<CourseListRow[]>([]);
  protected readonly applyingBulk = signal(false);

  readonly selectedCount = computed(() => this.selectedRows().length);

  /** Domain ids the current user owns or manages. Drives the
   *  manageable-only client-side filter — the backend's
   *  ``visible_to`` queryset already returns drafts for instructors,
   *  but it also returns published courses in domains the caller is
   *  merely a member of. We trim those out here so this page stays
   *  strictly instructor-facing. */
  private readonly manageableDomainIds = computed(() => {
    const me = this.userService.currentUser();
    if (!me) {
      return new Set<number>();
    }
    if (me.is_superuser) {
      return new Set(this.domains().map((d) => d.id));
    }
    const ids = new Set<number>();
    for (const domain of this.domains()) {
      if (domain.owner?.id === me.id || (domain.managers ?? []).some((u) => u.id === me.id)) {
        ids.add(domain.id);
      }
    }
    return ids;
  });

  private readonly domainNameById = computed(() => {
    const lang = this.currentLang();
    const map = new Map<number, string>();
    for (const domain of this.domains()) {
      map.set(domain.id, getLocalizedDomainName(domain, lang));
    }
    return map;
  });

  readonly rowsData = computed<CourseListRow[]>(() => {
    const lang = this.currentLang();
    const manageable = this.manageableDomainIds();
    const labels = this.ui();
    const levelLabels = this.common().levelLabels;
    const statusLabels = labels.statusLabels;
    const enrollmentBadgeLabels = labels.enrollmentBadge;
    const domainNames = this.domainNameById();
    return this.courses()
      .filter((c) => manageable.has(c.domain))
      .map<CourseListRow>((c) => ({
        id: c.id,
        slug: c.slug,
        title: pickTranslation(c.translations, lang, 'title') || `#${c.id}`,
        domainName: domainNames.get(c.domain) ?? `#${c.domain}`,
        domainId: c.domain,
        levelLabel: levelLabels[c.level] ?? c.level,
        enrollmentLabel: enrollmentBadgeLabels[c.enrollment_mode] ?? c.enrollment_mode,
        isPublished: !!c.is_published,
        statusLabel: c.is_published ? statusLabels.published : statusLabels.draft,
        lessonCount: typeof c.lesson_count === 'number' ? c.lesson_count : 0,
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  });

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.ui().bulk;
    return [
      {label: labels.publish, value: 'publish', icon: 'pi pi-eye'},
      {label: labels.unpublish, value: 'unpublish', icon: 'pi pi-eye-slash'},
      {label: labels.delete, value: 'delete', icon: 'pi pi-trash', danger: true},
    ];
  });

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.q.set(value);
        this.load();
      });
    this.loadDomains();
    this.load();
  }

  protected onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }

  protected onSelectionChange(rows: CourseListRow[]): void {
    this.selectedRows.set(rows);
  }

  protected goEdit(courseId: number): void {
    void this.router.navigateByUrl(LMS_COURSE_EDIT(courseId));
  }

  protected goView(slug: string): void {
    void this.router.navigateByUrl(LMS_COURSE_DETAIL(slug));
  }

  protected applyBulk(action: string): void {
    if (this.selectedCount() === 0 || this.applyingBulk()) {
      return;
    }
    const ids = this.selectedRows().map((r) => r.id);
    switch (action as BulkAction) {
      case 'publish':
        this.runBulk(ids, 'publish');
        return;
      case 'unpublish':
        this.runBulk(ids, 'unpublish');
        return;
      case 'delete':
        this.confirmDelete(ids);
        return;
    }
  }

  private runBulk(ids: number[], action: 'publish' | 'unpublish' | 'delete'): void {
    if (!ids.length) {
      return;
    }
    this.applyingBulk.set(true);
    const calls = ids.map((id) => {
      switch (action) {
        case 'publish':
          return this.catalog.publish(id);
        case 'unpublish':
          return this.catalog.unpublish(id);
        case 'delete':
          return this.catalog.deleteCourse(id);
      }
    });
    forkJoin(calls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selectedRows.set([]);
          const ui = this.ui();
          const summary =
            action === 'publish' ? ui.publishSuccessToast(ids.length)
            : action === 'unpublish' ? ui.unpublishSuccessToast(ids.length)
            : ui.deleteSuccessToast(ids.length);
          this.toast.add({severity: 'success', summary});
          this.load();
        },
        error: (err: unknown) => {
          logApiError(`lms.course-list.bulk.${action}`, err);
          this.toast.addApiError(err, this.ui().bulkErrorToast);
        },
        complete: () => this.applyingBulk.set(false),
      });
  }

  private confirmDelete(ids: number[]): void {
    const labels = this.ui().bulk;
    this.confirmationService.confirm({
      header: labels.confirmDeleteHeader,
      message: labels.confirmDeleteMessage(ids.length),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmDeleteAccept,
      rejectLabel: labels.confirmDeleteCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulk(ids, 'delete'),
    });
  }

  private load(): void {
    this.loading.set(true);
    const term = this.q().trim();
    this.catalog.list(term ? {search: term} : {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.courses.set((response?.results ?? []) as CourseListRowDto[]);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-list.load', err);
          this.courses.set([]);
          this.loading.set(false);
        },
      });
  }

  private loadDomains(): void {
    this.domainService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (domains) => this.domains.set(domains ?? []),
        error: (err: unknown) => {
          logApiError('lms.course-list.load-domains', err);
          this.domains.set([]);
        },
      });
  }
}
