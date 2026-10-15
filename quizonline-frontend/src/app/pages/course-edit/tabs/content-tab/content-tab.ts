import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {map} from 'rxjs';

import {CourseDetailDto} from '../../../../api/generated/model/course-detail';
import {EmptyStateComponent} from '../../../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {LessonContentEditor} from '../../../../shared/learning/lesson-content-editor/lesson-content-editor';
import {AppToastService} from '../../../../shared/toast/app-toast.service';

import {SKIP_UNSAVED_GUARD} from '../../unsaved-changes.guard';
import {getCourseEditContentTabUiText} from './content-tab.i18n';
import {CourseOutline, OutlineRef} from './course-outline/course-outline';
import {TranslationsDialog} from './translations-dialog/translations-dialog';

/**
 * "Content" tab of the course editor: the course outline on the left, the
 * selected lesson's content editor on the right. The selected lesson lives
 * in ``?lesson=`` so it is deep-linkable and survives reloads; a lesson id
 * that is not part of the course is ignored (with a toast, once).
 *
 * Every structural change (outline mutations, lesson rename, translations
 * dialog) flows up as an immutable course copy through ``courseChange`` —
 * the shell stores it without refetching.
 */
@Component({
  selector: 'app-course-edit-content-tab',
  imports: [CourseOutline, LessonContentEditor, EmptyStateComponent, TranslationsDialog],
  templateUrl: './content-tab.html',
  styleUrl: './content-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditContentTab {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);
  private readonly lessonEditor = viewChild(LessonContentEditor);

  protected readonly ui = inject(UiTextService).localized(getCourseEditContentTabUiText);

  readonly course = input<CourseDetailDto | null>(null);
  readonly courseChange = output<CourseDetailDto>();

  /** Narrow screens only: the outline pane can be folded away. */
  protected readonly outlineCollapsed = signal(false);
  /** Row whose translations dialog is open, if any. */
  protected readonly translations = signal<OutlineRef | null>(null);

  private readonly requestedLesson = toSignal(
    this.route.queryParamMap.pipe(map((q) => Number(q.get('lesson')) || null)),
    {initialValue: null},
  );
  private readonly lessonIds = computed(
    () => new Set((this.course()?.sections ?? []).flatMap((s) => (s.lessons ?? []).map((l) => l.id))),
  );
  protected readonly selectedLessonId = computed(() => {
    const id = this.requestedLesson();
    return id !== null && this.lessonIds().has(id) ? id : null;
  });

  /** Last ``?lesson=`` id checked against the course, so each id is judged once:
   *  a lesson deleted while selected (course updated before the URL) does not warn. */
  private checkedLesson: number | null = null;

  constructor() {
    effect(() => {
      const id = this.requestedLesson();
      if (id === null || !this.course() || id === this.checkedLesson) {
        return;
      }
      this.checkedLesson = id;
      if (!this.lessonIds().has(id)) {
        untracked(() => {
          this.toast.add({severity: 'warn', summary: this.ui().unknownLessonToast});
          this.writeLesson(null, true);
        });
      }
    });
  }

  /** True while the open lesson has a block in edit mode. */
  hasUnsavedChanges(): boolean {
    return this.lessonEditor()?.hasUnsavedChanges() ?? false;
  }

  /**
   * ``0`` clears the selection. It is only emitted after the author confirmed
   * deleting the selected lesson, so it skips the unsaved-work prompt. Any
   * other switch goes through ``unsavedChangesGuard`` (the route re-runs its
   * guards on query-param changes), which is the single place that prompts.
   */
  protected onSelect(id: number): void {
    this.writeLesson(id || null, false, id === 0);
  }

  /** The lesson editor renamed its lesson: mirror the course-language title in the outline. */
  protected onTitleChanged({id, title}: {id: number; title: string}): void {
    const c = this.course();
    if (!c) {
      return;
    }
    const lang = c.language_code;
    this.courseChange.emit({
      ...c,
      sections: (c.sections ?? []).map((s) =>
        s.lessons?.some((l) => l.id === id)
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === id
                  ? {...l, translations: {...l.translations, [lang]: {...l.translations?.[lang], title}}}
                  : l,
              ),
            }
          : s,
      ),
    });
  }

  private writeLesson(id: number | null, replaceUrl = false, skipUnsavedGuard = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {lesson: id},
      queryParamsHandling: 'merge',
      ...(replaceUrl ? {replaceUrl: true} : {}),
      ...(skipUnsavedGuard ? {state: {[SKIP_UNSAVED_GUARD]: true}} : {}),
    });
  }
}
