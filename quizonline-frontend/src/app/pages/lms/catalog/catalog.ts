import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {RouterLink} from '@angular/router';
import {Subject, debounceTime} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {TagModule} from 'primeng/tag';

import {LMS_COURSE_DETAIL, LMS_COURSE_NEW, LMS_LESSON_VIEW} from '../../../app.routes-paths';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {DomainService} from '../../../services/domain/domain';
import {logApiError} from '../../../shared/api/api-errors';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {pickTranslation, type TranslationsMap} from '../../../shared/lms/lms-translations';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {UserService} from '../../../services/user/user';

import {getLmsCatalogUiText} from './catalog.i18n';

/** Shape we render from the catalog API. ``unknown[]`` from the service is narrowed at usage. */
interface CatalogCourseRow {
  id: number;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollment_mode: 'open' | 'approval' | 'invite';
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
  lessonCountLabel: string | null;
  durationLabel: string | null;
  isEnrolled: boolean;
  progressPercent: number;
}

@Component({
  selector: 'app-lms-catalog',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    PageHeader,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCatalog implements OnInit {
  private readonly catalog = inject(LmsCatalogService);
  private readonly domainService = inject(DomainService);
  private readonly uiSvc = inject(UiTextService);
  private readonly userService = inject(UserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  /** Search-input keystrokes funnel through this 300 ms debounce so we
   *  never hammer the backend mid-typing. */
  private readonly searchInput$ = new Subject<string>();

  protected readonly ui = this.uiSvc.localized(getLmsCatalogUiText);
  protected readonly common = this.uiSvc.localized(getLmsCommonUiText);
  protected readonly currentLang = this.userService.lang;

  protected readonly courses = signal<CatalogCourseRow[]>([]);
  protected readonly search = signal('');
  protected readonly levelFilter = signal<string | null>(null);
  protected readonly domainFilter = signal<number | null>(null);
  /** Domains the user belongs to (owner / manager / member). Drives
   *  the domain filter dropdown so the catalog can be narrowed
   *  client-side and server-side to a single tenant. */
  protected readonly availableDomains = signal<DomainReadDto[]>([]);
  /** Whether the user has at least one manageable domain (owner / manager / superuser). */
  protected readonly canCreateCourse = signal(false);
  protected readonly createCourseHref = LMS_COURSE_NEW;

  protected readonly levelOptions = computed(() => {
    const labels = this.common().levelLabels;
    return [
      {value: null, label: this.ui().filterByLevelLabel},
      {value: 'beginner', label: labels.beginner},
      {value: 'intermediate', label: labels.intermediate},
      {value: 'advanced', label: labels.advanced},
    ];
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
    return this.courses().map((c) => {
      const me = c.my_enrollment ?? null;
      const enrolled = !!me && me.status !== 'cancelled';
      const nextLessonId = me?.next_lesson_id ?? null;
      return {
        id: c.id,
        slug: c.slug,
        levelLabel: levelLabels[c.level] ?? '',
        enrollmentLabel: enrollmentLabels[c.enrollment_mode] ?? '',
        title: pickTranslation(c.translations, lang, 'title'),
        description: this.sanitizer.bypassSecurityTrustHtml(
          pickTranslation(c.translations, lang, 'description') ?? '',
        ),
        href: LMS_COURSE_DETAIL(c.slug),
        continueHref: enrolled && nextLessonId ? LMS_LESSON_VIEW(nextLessonId) : null,
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
        this.refresh();
      });
  }

  private loadManageableDomains(): void {
    this.domainService.list().subscribe({
      next: (domains) => {
        const list = domains ?? [];
        this.availableDomains.set(list);
        this.canCreateCourse.set(list.some((d) => this.canManage(d)));
      },
      error: (err: unknown) => {
        logApiError('lms.catalog.load-domains', err);
        this.availableDomains.set([]);
        this.canCreateCourse.set(false);
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
    this.refresh();
  }

  protected onDomainChange(value: number | null): void {
    this.domainFilter.set(value);
    this.refresh();
  }

  private refresh(): void {
    const params: {search?: string; level?: string; domain?: number} = {};
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
    this.catalog.list(params).subscribe({
      next: (response) => {
        const results = (response?.results ?? []) as CatalogCourseRow[];
        this.courses.set(results);
      },
      error: (err: unknown) => {
        logApiError('lms.catalog.list', err);
        this.courses.set([]);
      },
    });
  }
}
