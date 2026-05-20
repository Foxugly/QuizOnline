import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';

import {CATALOG} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getLearningCommonUiText} from '../../shared/learning/learning-common.i18n';
import {RelativeDatePipe} from '../../shared/pipes/relative-date.pipe';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';

import {getProgressUiText} from './progress.i18n';

/**
 * Shape we render from ``GET /api/progress/``. ``course_title`` is
 * a ``SerializerMethodField`` on the backend that returns the localized
 * Course title (falling back to the slug server-side), so it is always
 * a non-empty string at this layer.
 */
interface ProgressRow {
  id: number;
  course: number;
  course_title: string;
  course_slug?: string | null;
  progress_percent: number;
  completed_lessons_count?: number;
  total_lessons_count?: number;
  updated_at: string;
}

interface ProgressRowVm {
  id: number;
  title: string;
  progressPercent: number;
  updatedAt: string;
  isCompleted: boolean;
}

@Component({
  selector: 'app-progress',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    RelativeDatePipe,
    PageHeader,
  ],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  private readonly enrollment = inject(EnrollmentService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getProgressUiText);
  protected readonly common = this.uiSvc.localized(getLearningCommonUiText);
  protected readonly rows = signal<ProgressRow[]>([]);
  protected readonly catalogHref = CATALOG;

  protected readonly viewRows = computed<ProgressRowVm[]>(() =>
    this.rows().map((row) => ({
      id: row.id,
      title: row.course_title,
      progressPercent: row.progress_percent ?? 0,
      updatedAt: row.updated_at,
      isCompleted: (row.progress_percent ?? 0) >= 100,
    })),
  );

  constructor() {
    this.enrollment.myProgress().subscribe({
      next: (response: unknown) => {
        const payload = response as {results?: ProgressRow[]} | ProgressRow[] | null;
        if (Array.isArray(payload)) {
          this.rows.set(payload);
        } else {
          this.rows.set(payload?.results ?? []);
        }
      },
      error: (err: unknown) => {
        logApiError('lms.progress.list', err);
        this.rows.set([]);
      },
    });
  }
}
