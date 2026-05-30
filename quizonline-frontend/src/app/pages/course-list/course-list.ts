import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {Subject as RxSubject, debounceTime, forkJoin} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {PaginatorModule} from 'primeng/paginator';
import {TableModule, type TableLazyLoadEvent} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {TooltipModule} from 'primeng/tooltip';
import {ConfirmationService} from 'primeng/api';

import {CATALOG, COURSE_DETAIL, COURSE_EDIT, COURSE_NEW} from '../../app.routes-paths';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainService} from '../../services/domain/domain';
import {CatalogService} from '../../services/catalog/catalog.service';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';
import {BulkActionOption, BulkActionsComponent} from '../../shared/components/bulk-actions/bulk-actions';
import {TableSkeleton} from '../../shared/components/loading-skeleton/table-skeleton';
import {getLocalizedDomainName} from '../../shared/i18n/domain-label';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getLearningCommonUiText} from '../../shared/learning/learning-common.i18n';
import {pickTranslation, type TranslationsMap} from '../../shared/learning/learning-translations';
import {AppToastService} from '../../shared/toast/app-toast.service';

import {getCourseListUiText} from './course-list.i18n';

/** Course shape returned by ``GET /api/course/`` — narrow subset
 *  of :class:`CourseListSerializer` fields the admin table actually
 *  consumes. ``unknown[]`` from :class:`CatalogService.list` is
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

/** Fixed page size — must match the backend's ``API_PAGE_SIZE``
 *  (default 20). DRF's ``PageNumberPagination`` does not honour
 *  ``?page_size=`` unless ``page_size_query_param`` is explicitly
 *  enabled, so we cannot drive this from the table's rows-per-page
 *  selector. The PrimeNG paginator therefore renders without a
 *  rows-per-page control. */
const PAGE_SIZE = 20;

@Component({
  selector: 'app-course-list',
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
    TableSkeleton,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseList implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly domainService = inject(DomainService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput$ = new RxSubject<string>();

  readonly ui = inject(UiTextService).localized(getCourseListUiText);
  readonly common = inject(UiTextService).localized(getLearningCommonUiText);
  readonly editorUi = inject(UiTextService).editor;
  private readonly currentLang = this.userService.lang;

  protected readonly catalogHref = CATALOG;
  protected readonly createCourseHref = COURSE_NEW;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly courses = signal<CourseListRowDto[]>([]);
  protected readonly domains = signal<DomainReadDto[]>([]);
  /** Total result count surfaced by DRF's pagination — feeds the
   *  PrimeNG table's ``[totalRecords]`` so the paginator renders the
   *  right number of pages even though we only hold one page in
   *  memory. */
  protected readonly totalCount = signal(0);
  /** Zero-based offset PrimeNG drives via ``first`` in
   *  ``TableLazyLoadEvent``. We translate it back to a 1-based DRF
   *  page index before talking to the backend. */
  protected readonly first = signal(0);
  protected readonly q = signal('');
  protected readonly loading = signal(false);
  protected readonly initialLoad = signal(true);
  protected readonly selectedRows = signal<CourseListRow[]>([]);
  protected readonly applyingBulk = signal(false);

  readonly selectedCount = computed(() => this.selectedRows().length);

  private readonly domainNameById = computed(() => {
    const lang = this.currentLang();
    const map = new Map<number, string>();
    for (const domain of this.domains()) {
      map.set(domain.id, getLocalizedDomainName(domain, lang));
    }
    return map;
  });

  /** View-model rows for the current page. No client-side filtering
   *  anymore — the backend's ``?manageable_only=1`` filter already
   *  scopes the result to courses the caller can manage, so what we
   *  receive IS the page that should be displayed. */
  readonly rowsData = computed<CourseListRow[]>(() => {
    const lang = this.currentLang();
    const labels = this.ui();
    const levelLabels = this.common().levelLabels;
    const statusLabels = labels.statusLabels;
    const enrollmentBadgeLabels = labels.enrollmentBadge;
    const domainNames = this.domainNameById();
    return this.courses().map<CourseListRow>((c) => ({
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
    }));
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
        // A new search resets to page 1 so a user typing on page 5
        // does not stare at "no results" because page 5 of the
        // filtered set is empty.
        this.first.set(0);
        this.load();
      });
    this.loadDomains();
    // First fetch has to be driven from here: the table is rendered
    // inside an ``@if (initialLoad())`` else-branch so its own
    // ``onLazyLoad`` does not fire until ``initialLoad`` flips to
    // false — which only happens after ``load()`` resolves. The
    // table's ``[lazyLoadOnInit]="false"`` then suppresses the
    // auto-fire that would otherwise re-fetch the same page once it
    // finally renders.
    this.load();
  }

  protected onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }

  protected onSelectionChange(rows: CourseListRow[]): void {
    this.selectedRows.set(rows);
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const offset = typeof event.first === 'number' ? event.first : 0;
    this.first.set(offset);
    this.load();
  }

  protected goEdit(courseId: number): void {
    void this.router.navigateByUrl(COURSE_EDIT(courseId));
  }

  protected goView(slug: string): void {
    void this.router.navigateByUrl(COURSE_DETAIL(slug));
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
    const page = Math.floor(this.first() / PAGE_SIZE) + 1;
    this.catalog.list({
      manageableOnly: true,
      page,
      ...(term ? {search: term} : {}),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.courses.set((response?.results ?? []) as CourseListRowDto[]);
          this.totalCount.set(typeof response?.count === 'number' ? response.count : 0);
          this.loading.set(false);
          this.initialLoad.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-list.load', err);
          this.courses.set([]);
          this.totalCount.set(0);
          this.loading.set(false);
          this.initialLoad.set(false);
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
