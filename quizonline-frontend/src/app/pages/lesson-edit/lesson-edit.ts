import {ChangeDetectionStrategy, Component, OnInit, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';

import {CATALOG, COURSE_EDIT_TAB} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {UiTextService} from '../../shared/i18n/ui-text.service';

import {getLessonEditUiText} from './lesson-edit.i18n';

/**
 * Legacy ``/lesson/{id}/edit`` entry point. The lesson editor now lives in
 * the "Content" tab of the course editor (``<app-lesson-content-editor>``),
 * so this page only resolves the lesson's course and redirects there.
 */
@Component({
  selector: 'app-lesson-edit',
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly ui = inject(UiTextService).localized(getLessonEditUiText);

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/v1`;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.router.navigateByUrl(CATALOG, {replaceUrl: true});
      return;
    }
    this.http.get<{course_id?: number}>(`${this.apiBaseUrl}/lesson/${id}/`).subscribe({
      next: (l) =>
        this.router.navigateByUrl(
          l.course_id ? COURSE_EDIT_TAB(l.course_id, 'content', id) : CATALOG,
          {replaceUrl: true},
        ),
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.redirect', err);
        this.router.navigateByUrl(CATALOG, {replaceUrl: true});
      },
    });
  }
}
