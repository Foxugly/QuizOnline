import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {DataViewModule} from 'primeng/dataview';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {TagModule} from 'primeng/tag';

import {LMS_COURSE_DETAIL} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
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
}

/** View-model rendered by the template. Pre-resolves all localized strings and href. */
interface CatalogCardVm {
  id: number;
  slug: string;
  levelLabel: string;
  enrollmentLabel: string;
  title: string;
  description: string;
  href: string;
}

@Component({
  selector: 'app-lms-catalog',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DataViewModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCatalog {
  private readonly catalog = inject(LmsCatalogService);
  private readonly uiSvc = inject(UiTextService);
  private readonly userService = inject(UserService);

  protected readonly ui = this.uiSvc.localized(getLmsCatalogUiText);
  protected readonly common = this.uiSvc.localized(getLmsCommonUiText);
  protected readonly currentLang = this.userService.lang;

  protected readonly courses = signal<CatalogCourseRow[]>([]);
  protected readonly search = signal('');
  protected readonly levelFilter = signal<string | null>(null);

  protected readonly levelOptions = computed(() => {
    const labels = this.common().levelLabels;
    return [
      {value: null, label: this.ui().filterByLevelLabel},
      {value: 'beginner', label: labels.beginner},
      {value: 'intermediate', label: labels.intermediate},
      {value: 'advanced', label: labels.advanced},
    ];
  });

  protected readonly cards = computed<CatalogCardVm[]>(() => {
    const lang = this.currentLang();
    const levelLabels = this.common().levelLabels;
    const enrollmentLabels = this.ui().enrollmentBadge;
    return this.courses().map((c) => ({
      id: c.id,
      slug: c.slug,
      levelLabel: levelLabels[c.level] ?? '',
      enrollmentLabel: enrollmentLabels[c.enrollment_mode] ?? '',
      title: pickTranslation(c.translations, lang, 'title'),
      description: pickTranslation(c.translations, lang, 'description'),
      href: LMS_COURSE_DETAIL(c.slug),
    }));
  });

  constructor() {
    this.refresh();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.refresh();
  }

  protected onLevelChange(value: string | null): void {
    this.levelFilter.set(value);
    this.refresh();
  }

  private refresh(): void {
    const params: {search?: string; level?: string} = {};
    const term = this.search().trim();
    if (term) {
      params.search = term;
    }
    const level = this.levelFilter();
    if (level) {
      params.level = level;
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
