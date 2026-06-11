import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {RouterLink} from '@angular/router';
import {Subject, debounceTime} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {PaginatorModule, type PaginatorState} from 'primeng/paginator';
import {SelectModule} from 'primeng/select';
import {TagModule} from 'primeng/tag';
import {TooltipModule} from 'primeng/tooltip';

import {COURSE_DETAIL, COURSE_EDIT, COURSE_LIST, COURSE_NEW, LESSON_VIEW} from '../../app.routes-paths';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainService} from '../../services/domain/domain';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {getLocalizedDomainName} from '../../shared/i18n/domain-label';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getLearningCommonUiText} from '../../shared/learning/learning-common.i18n';
import {pickTranslation, type TranslationsMap} from '../../shared/learning/learning-translations';
import {CatalogService} from '../../services/catalog/catalog.service';
import {UserService} from '../../services/user/user';

import {getCatalogUiText} from './catalog.i18n';

/** Shape we render from the catalog API. ``unknown[]`` from the service is narrowed at usage. */
interface CatalogCourseRow {
  id: number;
  slug: string;
  /** Domain id — needed to derive whether the caller can manage this
   *  course (owns or manages its domain). Not currently surfaced as
   *  ``can_manage`` on :class:`CourseListSerializer`, so we resolve
   *  it client-side against the user's manageable domain set. */
  domain: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollment_mode: 'open' | 'approval' | 'invite';
  /** True when the course has been published. Drafts only reach the
   *  catalog response for instructors (the backend ``visible_to``
   *  queryset filters them out for plain members) so the per-card
   *  status tag is only meaningful when the caller can manage the
   *  course in the first place. */
  is_published: boolean;
  translations?: TranslationsMap;
  lesson_count?: number;
  total_duration_minutes?: number;
  my_enrollment?: {
    status: 'active' | 'pending' | 'completed' | 'cancelled';
    progress_percent: number;
    next_lesson_id: number | null;
  } | null;
}

/** View-model rendered by the template. Pre-resolves all localized strings and href.
 *  ``description`` is HTML produced by the rich-text editor; backend sanitizes
 *  via nh3 on write, so we can trust it for ``[innerHTML]`` rendering. */
interface CatalogCardVm {
  id: number;
  slug: string;
  levelLabel: string;
  enrollmentLabel: string;
  title: string;
  description: SafeHtml;
  href: string;
  /** Resume-on lesson route when the caller is enrolled and has a
   *  next-uncompleted lesson; ``null`` otherwise (the card just routes
   *  to the course detail). */
  continueHref: string | null;
  /** Edit deep-link surfaced as a small action button at the top-right
   *  of the card for instructors only (owner / manager of the course's
   *  domain, or superuser). ``null`` hides the button entirely. */
  editHref: string | null;
  /** Localized "Publié" / "Brouillon" badge label — surfaced only for
   *  cards the caller can manage. ``null`` hides the badge entirely so
   *  learners (who only ever see published courses in their list)
   *  don't see a redundant "Publié" tag on every card. */
  statusLabel: string | null;
  /** Drives the badge severity + icon — ``true`` for published. */
  statusIsPublished: boolean;
  lessonCountLabel: string | null;
  durationLabel: string | null;
  isEnrolled: boolean;
  progressPercent: number;
}

@Component({
  selector: 'app-catalog',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TagModule,
    TooltipModule,
    PageHeader,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly domainService = inject(DomainService);
  private readonly uiSvc = inject(UiTextService);
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  /** Search-input keystrokes funnel through this 300 ms debounce so we
   *  never hammer the backend mid-typing. */
  private readonly searchInput$ = new Subject<string>();

  protected readonly ui = this.uiSvc.localized(getCatalogUiText);
  protected readonly common = this.uiSvc.localized(getLearningCommonUiText);
  /** Shared "Edit" label served by the editor-scoped i18n dictionary
   *  — reused on the per-card instructor Edit button so we don't add
   *  a duplicate string to the catalog's own i18n. */
  protected readonly editorUi = this.uiSvc.editor;
  protected readonly currentLang = this.userService.lang;

  protected readonly courses = signal<CatalogCourseRow[]>([]);
  protected readonly search = signal('');
  protected readonly levelFilter = signal<string | null>(null);
  protected readonly domainFilter = signal<number | null>(null);
  /** Total result count surfaced by DRF's pagination — feeds the
   *  PrimeNG paginator's ``[totalRecords]`` so the page count is
   *  accurate even though we only ever hold one page in memory. */
  protected readonly totalCount = signal(0);
  /** Zero-based offset PrimeNG drives via ``PaginatorState.first``.
   *  Mapped back to DRF's 1-based ``?page=`` in :meth:`refresh`. */
  protected readonly first = signal(0);
  /** Fixed page size. Must match ``settings.API_PAGE_SIZE`` (default
   *  20) since DRF's PageNumberPagination does not honour
   *  ``?page_size=`` unless ``page_size_query_param`` is explicitly
   *  enabled. The PrimeNG paginator renders without a rows-per-page
   *  control as a result. */
  protected readonly pageSize = 20;
  /** Domains the user belongs to (owner / manager / member). Drives
   *  the domain filter dropdown so the catalog can be narrowed
   *  client-side and server-side to a single tenant. */
  protected readonly availableDomains = signal<DomainReadDto[]>([]);
  /** True once ``GET /domain`` has settled (success or error). The per-card
   *  Edit button / draft badge depend on ``manageableDomainIds`` which is
   *  empty until then; gating the grid on this avoids the cards rendering
   *  without Edit and then re-rendering with it (a visible flash for
   *  instructors) once the domains arrive. */
  protected readonly domainsLoaded = signal(false);
  /** Whether the user has at least one manageable domain (owner / manager / superuser). */
  protected readonly canCreateCourse = signal(false);
  protected readonly createCourseHref = COURSE_NEW;
  protected readonly courseListHref = COURSE_LIST;

  protected readonly levelOptions = computed(() => {
    const labels = this.common().levelLabels;
    return [
      {value: null, label: this.ui().filterByLevelLabel},
      {value: 'beginner', label: labels.beginner},
      {value: 'intermediate', label: labels.intermediate},
      {value: 'advanced', label: labels.advanced},
    ];
  });

  /** Set of domain ids the caller owns or manages. Drives the
   *  per-card Edit button visibility — superusers see Edit on every
   *  card by policy, instructors only on cards in their own domains.
   *  ``availableDomains`` is the same list that backs the create-
   *  course gate, so the two affordances stay in sync. */
  private readonly manageableDomainIds = computed(() => {
    const me = this.userService.currentUser();
    if (!me) {
      return new Set<number>();
    }
    if (me.is_superuser) {
      return new Set(this.availableDomains().map((d) => d.id));
    }
    const ids = new Set<number>();
    for (const d of this.availableDomains()) {
      if (this.canManage(d)) {
        ids.add(d.id);
      }
    }
    return ids;
  });

  /** Domain dropdown options. Re-uses the same label helper as the
   *  topmenu's domain selector so the rendered name stays consistent. */
  protected readonly domainOptions = computed(() => {
    const lang = this.currentLang();
    return this.availableDomains().map((d) => ({
      value: d.id,
      label: getLocalizedDomainName(d, lang),
    }));
  });

  protected readonly cards = computed<CatalogCardVm[]>(() => {
    const lang = this.currentLang();
    const ui = this.ui();
    const levelLabels = this.common().levelLabels;
    const enrollmentLabels = ui.enrollmentBadge;
    const manageable = this.manageableDomainIds();
    return this.courses().map((c) => {
      const me = c.my_enrollment ?? null;
      const enrolled = !!me && me.status !== 'cancelled';
      const nextLessonId = me?.next_lesson_id ?? null;
      const canManage = manageable.has(c.domain);
      const isPublished = !!c.is_published;
      return {
        id: c.id,
        slug: c.slug,
        levelLabel: levelLabels[c.level] ?? '',
        enrollmentLabel: enrollmentLabels[c.enrollment_mode] ?? '',
        title: pickTranslation(c.translations, lang, 'title'),
        description: this.sanitizer.bypassSecurityTrustHtml(
          pickTranslation(c.translations, lang, 'description') ?? '',
        ),
        href: COURSE_DETAIL(c.slug),
        continueHref: enrolled && nextLessonId ? LESSON_VIEW(nextLessonId) : null,
        editHref: canManage ? COURSE_EDIT(c.id) : null,
        statusLabel: canManage
          ? (isPublished ? ui.statusLabels.published : ui.statusLabels.draft)
          : null,
        statusIsPublished: isPublished,
        lessonCountLabel: typeof c.lesson_count === 'number' && c.lesson_count > 0
          ? ui.lessonCount(c.lesson_count) : null,
        durationLabel: typeof c.total_duration_minutes === 'number' && c.total_duration_minutes > 0
          ? ui.duration(c.total_duration_minutes) : null,
        isEnrolled: enrolled,
        progressPercent: me?.progress_percent ?? 0,
      };
    });
  });

  constructor() {
    this.refresh();
    this.loadManageableDomains();
  }

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value);
        // Typing in the search box resets to page 1 — staying on page
        // 5 of the prior result set would leave the user staring at
        // an empty grid when the new filter has fewer pages.
        this.first.set(0);
        this.refresh();
      });
  }

  protected onPageChange(event: PaginatorState): void {
    const offset = typeof event.first === 'number' ? event.first : 0;
    this.first.set(offset);
    this.refresh();
  }

  private loadManageableDomains(): void {
    this.domainService.list().subscribe({
      next: (domains) => {
        const list = domains ?? [];
        this.availableDomains.set(list);
        this.canCreateCourse.set(list.some((d) => this.canManage(d)));
        this.domainsLoaded.set(true);
      },
      error: (err: unknown) => {
        logApiError('lms.catalog.load-domains', err);
        this.availableDomains.set([]);
        this.canCreateCourse.set(false);
        this.domainsLoaded.set(true);
      },
    });
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

  protected onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }

  protected onLevelChange(value: string | null): void {
    this.levelFilter.set(value);
    this.first.set(0);
    this.refresh();
  }

  protected onDomainChange(value: number | null): void {
    this.domainFilter.set(value);
    this.first.set(0);
    this.refresh();
  }

  private refresh(): void {
    const params: {search?: string; level?: string; domain?: number; page?: number} = {};
    const term = this.search().trim();
    if (term) {
      params.search = term;
    }
    const level = this.levelFilter();
    if (level) {
      params.level = level;
    }
    const domain = this.domainFilter();
    if (domain) {
      params.domain = domain;
    }
    const page = Math.floor(this.first() / this.pageSize) + 1;
    if (page > 1) {
      params.page = page;
    }
    this.catalog.list(params).subscribe({
      next: (response) => {
        const results = (response?.results ?? []) as CatalogCourseRow[];
        this.courses.set(results);
        this.totalCount.set(typeof response?.count === 'number' ? response.count : 0);
      },
      error: (err: unknown) => {
        logApiError('lms.catalog.list', err);
        this.courses.set([]);
        this.totalCount.set(0);
      },
    });
  }
}
