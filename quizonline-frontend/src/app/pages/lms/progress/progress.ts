import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';

import {LMS_CATALOG} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {RelativeDatePipe} from '../../../shared/pipes/relative-date.pipe';
import {LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';

import {getLmsProgressUiText} from './progress.i18n';

/**
 * Shape we render from ``GET /api/lms/progress/``. The current
 * ``CourseProgressSerializer`` only exposes the FK id (``course``) and
 * not the localized title — a follow-up backend task can wire a
 * ``SerializerMethodField('course_title')``. We accept both today and
 * fall back to a "Course #id" string in the page i18n.
 */
interface ProgressRow {
  id: number;
  course: number;
  course_title?: string | null;
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
  selector: 'app-lms-progress',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    RelativeDatePipe,
  ],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsProgress {
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getLmsProgressUiText);
  protected readonly common = this.uiSvc.localized(getLmsCommonUiText);
  protected readonly rows = signal<ProgressRow[]>([]);
  protected readonly catalogHref = LMS_CATALOG;

  protected readonly viewRows = computed<ProgressRowVm[]>(() => {
    const fallback = this.ui().courseFallback;
    return this.rows().map((row) => ({
      id: row.id,
      title: row.course_title?.trim() || fallback(row.course),
      progressPercent: row.progress_percent ?? 0,
      updatedAt: row.updated_at,
      isCompleted: (row.progress_percent ?? 0) >= 100,
    }));
  });

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
