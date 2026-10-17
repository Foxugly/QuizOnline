import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, CdkDropListGroup, moveItemInArray} from '@angular/cdk/drag-drop';
import {finalize, Observable} from 'rxjs';
import {ConfirmationService, MenuItem} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {Menu, MenuModule} from 'primeng/menu';
import {TooltipModule} from 'primeng/tooltip';

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {LessonMoveResultDto} from '../../../../../api/generated/model/lesson-move-result';
import {LessonSummaryDto} from '../../../../../api/generated/model/lesson-summary';
import {SectionDto} from '../../../../../api/generated/model/section';
import {CatalogService} from '../../../../../services/catalog/catalog.service';
import {logApiError} from '../../../../../shared/api/api-errors';
import {StatusBadgeComponent} from '../../../../../shared/components/status-badge/status-badge';
import {interp} from '../../../../../shared/i18n/format';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {getCourseOutlineUiText} from './course-outline.i18n';
import {applyLessonDrop, insertSorted, missingLanguages, titleIn} from './outline.util';

export type OutlineKind = 'section' | 'lesson';
export interface OutlineRef {
  kind: OutlineKind;
  id: number;
}
type Translations = Record<string, Record<string, string>> | undefined;
/** ``cdkDropListData`` of a section's lesson list. */
export interface LessonListData {
  sectionId: number;
}

const byOrder = (a: {order?: number}, b: {order?: number}) => (a.order ?? 0) - (b.order ?? 0);
const withOrder = <T extends {order?: number}>(x: T): T & {order: number} => ({...x, order: x.order ?? 0});

/**
 * Left pane of the course editor: sections and their lessons, with inline
 * create (Enter creates in the course language, Escape cancels), inline
 * rename on double-click, a "⋯" menu per row (publish, free preview,
 * translations, delete) and a "missing languages" hint for rows whose
 * title is still empty in some course language (machine translation runs
 * asynchronously after create). Sections and lessons are reordered by drag
 * and drop (handle only); lessons can also be dropped into another section.
 *
 * Owns a local copy of the course so the outline reflects every mutation
 * at once, and emits each updated copy through ``courseChange``.
 */
@Component({
  selector: 'app-course-outline',
  imports: [
    CdkDrag, CdkDragHandle, CdkDropList, CdkDropListGroup,
    ButtonModule, ConfirmDialogModule, InputTextModule, MenuModule, TooltipModule, StatusBadgeComponent],
  providers: [ConfirmationService],
  templateUrl: './course-outline.html',
  styleUrl: './course-outline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseOutline {
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(AppToastService);
  private readonly confirmer = inject(ConfirmationService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getCourseOutlineUiText);
  protected readonly shellUi = this.uiSvc.ui;

  readonly course = input.required<CourseDetailDto>();
  readonly selectedLessonId = input<number | null>(null);

  /** Lesson to show in the right pane; ``0`` = none (the selected one was deleted). */
  readonly lessonSelect = output<number>();
  readonly courseChange = output<CourseDetailDto>();
  readonly openTranslations = output<OutlineRef>();

  protected readonly addingLessonIn = signal<number | null>(null);
  protected readonly addingSection = signal(false);
  protected readonly renaming = signal<OutlineRef | null>(null);
  protected readonly draft = signal('');
  protected readonly busy = signal(false);
  protected readonly menuItems = signal<MenuItem[]>([]);

  private readonly menu = viewChild<Menu>('menu');
  private readonly outline = linkedSignal(() => this.course());

  protected readonly lang = computed(() => this.outline().language_code);
  protected readonly langs = computed(() => this.outline().available_lang_codes ?? []);
  protected readonly sections = computed(() => [...(this.outline().sections ?? [])].sort(byOrder));

  protected lessonsOf(section: SectionDto): LessonSummaryDto[] {
    return [...(section.lessons ?? [])].sort(byOrder);
  }

  protected titleOf(row: SectionDto | LessonSummaryDto, kind: OutlineKind): string {
    const fallback = kind === 'section' ? this.ui().untitledSection : this.ui().untitledLesson;
    return titleIn(row.translations, this.lang()) || fallback;
  }

  protected missing(tr: Translations): string {
    return missingLanguages(tr, this.langs()).join(', ').toUpperCase();
  }

  protected isRenaming(kind: OutlineKind, id: number): boolean {
    const r = this.renaming();
    return r !== null && r.kind === kind && r.id === id;
  }

  // -- Inline inputs -------------------------------------------------------

  protected openAddLesson(sectionId: number): void {
    this.cancelInline();
    this.addingLessonIn.set(sectionId);
    this.focusInput();
  }

  protected openAddSection(): void {
    this.cancelInline();
    this.addingSection.set(true);
    this.focusInput();
  }

  protected startRename(kind: OutlineKind, id: number, tr: Translations): void {
    this.cancelInline();
    this.draft.set(tr?.[this.lang()]?.['title'] ?? '');
    this.renaming.set({kind, id});
    this.focusInput();
  }

  protected submitLesson(sectionId: number): void {
    const title = this.draft().trim();
    if (!title || this.busy()) return;
    this.mutate(
      this.catalog.createLesson({section: sectionId, translations: {[this.lang()]: {title}}}),
      'create-lesson',
      (created) => {
        const lesson = created as LessonSummaryDto;
        this.patchSection(sectionId, (s) => ({...s, lessons: insertSorted([...(s.lessons ?? [])], lesson)}));
        this.addingLessonIn.set(null);
        this.draft.set('');
        this.lessonSelect.emit(lesson.id);
      },
    );
  }

  protected submitSection(): void {
    const title = this.draft().trim();
    if (!title || this.busy()) return;
    this.mutate(
      this.catalog.createSection({course: this.outline().id, translations: {[this.lang()]: {title}}}),
      'create-section',
      (created) => {
        const section = {...(created as SectionDto), lessons: []};
        this.patchCourse((c) => ({...c, sections: insertSorted((c.sections ?? []).map(withOrder), withOrder(section))}));
        this.addingSection.set(false);
        this.draft.set('');
        this.addingLessonIn.set(section.id);
        this.focusInput();
      },
    );
  }

  protected submitRename(): void {
    const target = this.renaming();
    const title = this.draft().trim();
    if (!target || this.busy()) return;
    if (!title) {
      this.renaming.set(null);
      this.draft.set('');
      return;
    }
    const translations = {[this.lang()]: {title}};
    const request =
      target.kind === 'section'
        ? this.catalog.updateSection(target.id, {translations})
        : this.catalog.updateLesson(target.id, {translations});
    this.mutate(request, `rename-${target.kind}`, (res) => {
      const tr = (res as {translations?: Translations} | null)?.translations;
      const merge = <T extends {translations: Translations}>(row: T): T => ({
        ...row,
        translations: tr ?? {...row.translations, ...translations},
      });
      this.patchRow(target, merge);
      this.renaming.set(null);
      this.draft.set('');
    });
  }

  // -- "⋯" menu ------------------------------------------------------------

  protected openMenu(event: Event, kind: OutlineKind, row: SectionDto | LessonSummaryDto): void {
    event.stopPropagation();
    const ui = this.ui();
    const ref: OutlineRef = {kind, id: row.id};
    const items: MenuItem[] = [
      {label: ui.renameAction, icon: 'pi pi-pencil', command: () => this.startRename(kind, row.id, row.translations)},
      {
        label: row.is_published ? ui.menuUnpublish : ui.menuPublish,
        icon: row.is_published ? 'pi pi-eye-slash' : 'pi pi-check-circle',
        command: () => this.togglePublished(ref, !row.is_published),
      },
    ];
    if (kind === 'lesson') {
      const preview = (row as LessonSummaryDto).is_preview;
      items.push({
        label: preview ? ui.menuPreviewOff : ui.menuPreviewOn,
        icon: 'pi pi-lock-open',
        command: () => this.togglePreview(row.id, !preview),
      });
    }
    items.push(
      {label: ui.menuTranslations, icon: 'pi pi-language', command: () => this.openTranslations.emit(ref)},
      {separator: true},
      {label: ui.menuDelete, icon: 'pi pi-trash', command: () => this.confirmDelete(ref, this.titleOf(row, kind))},
    );
    this.menuItems.set(items);
    this.menu()?.toggle(event);
  }

  private togglePublished(ref: OutlineRef, publish: boolean): void {
    if (this.busy()) return;
    const c = this.catalog;
    const request =
      ref.kind === 'section'
        ? publish ? c.publishSection(ref.id) : c.unpublishSection(ref.id)
        : publish ? c.publishLesson(ref.id) : c.unpublishLesson(ref.id);
    this.mutate(request, `${publish ? 'publish' : 'unpublish'}-${ref.kind}`, (res) => {
      const flag = (res as {is_published?: boolean} | null)?.is_published ?? publish;
      this.patchRow(ref, (row) => ({...row, is_published: flag}));
    });
  }

  private togglePreview(id: number, preview: boolean): void {
    if (this.busy()) return;
    this.mutate(this.catalog.updateLesson(id, {is_preview: preview}), 'toggle-preview', (res) => {
      const flag = (res as {is_preview?: boolean} | null)?.is_preview ?? preview;
      this.patchRow({kind: 'lesson', id}, (row) => ({...row, is_preview: flag}));
    });
  }

  private confirmDelete(ref: OutlineRef, title: string): void {
    const ui = this.ui();
    this.confirmer.confirm({
      header: ui.confirmDeleteHeader,
      message: interp(ref.kind === 'section' ? ui.confirmDeleteSection : ui.confirmDeleteLesson, {title}),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: ui.confirmAccept,
      rejectLabel: ui.confirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(ref),
    });
  }

  private delete(ref: OutlineRef): void {
    if (this.busy()) return;
    const request =
      ref.kind === 'section' ? this.catalog.deleteSection(ref.id) : this.catalog.deleteLesson(ref.id);
    this.mutate(request, `delete-${ref.kind}`, () => {
      const selected = this.selectedLessonId();
      const section = this.outline().sections?.find((s) => s.id === ref.id);
      const losesSelection =
        ref.kind === 'lesson'
          ? ref.id === selected
          : !!section?.lessons?.some((l) => l.id === selected);
      if (ref.kind === 'section') {
        this.patchCourse((c) => ({...c, sections: (c.sections ?? []).filter((s) => s.id !== ref.id)}));
      } else {
        this.patchCourse((c) => ({
          ...c,
          sections: (c.sections ?? []).map((s) => ({...s, lessons: (s.lessons ?? []).filter((l) => l.id !== ref.id)})),
        }));
      }
      if (losesSelection) {
        this.lessonSelect.emit(0);
      }
    });
  }

  // -- Drag and drop -------------------------------------------------------

  /** Section rows (vertical list, handle only): optimistic reorder, rolled back on error. */
  protected onSectionDrop(e: CdkDragDrop<unknown>): void {
    if (e.previousIndex === e.currentIndex || this.busy()) return;
    const before = this.outline();
    const list = [...this.sections()];
    moveItemInArray(list, e.previousIndex, e.currentIndex);
    this.patchCourse((c) => ({...c, sections: list.map((s, i) => ({...s, order: i}))}));
    this.mutate(
      this.catalog.reorderSections(before.id, list.map((s) => s.id)),
      'reorder-sections',
      () => undefined,
      () => this.restore(before),
    );
  }

  /**
   * Lesson rows: within a section → ``reorderLessons``; into another section
   * → ``moveLesson`` and both sections are patched from the response. The
   * outline is updated at once and restored if the request fails.
   */
  protected onLessonDrop(e: CdkDragDrop<LessonListData, LessonListData, number>): void {
    const from = e.previousContainer.data.sectionId;
    const to = e.container.data.sectionId;
    if ((from === to && e.previousIndex === e.currentIndex) || this.busy()) return;
    const before = this.outline();
    const lessonId = e.item.data;
    // Indexes are display indexes: apply them to lessons sorted by order.
    const sorted = this.sections().map((s) => ({...s, lessons: this.lessonsOf(s)}));
    const sections = applyLessonDrop(sorted, lessonId, to, e.currentIndex);
    this.patchCourse((c) => ({...c, sections}));
    if (from === to) {
      const ids = (sections.find((s) => s.id === to)?.lessons ?? []).map((l) => l.id);
      this.mutate(this.catalog.reorderLessons(to, ids), 'reorder-lessons', () => undefined, () => this.restore(before));
      return;
    }
    this.mutate(
      this.catalog.moveLesson(lessonId, to, e.currentIndex),
      'move-lesson',
      (res) => {
        const {source_section: src, target_section: dst} = res as LessonMoveResultDto;
        for (const patch of [src, dst]) {
          // Keep the optimistic lessons if the response omits them.
          this.patchSection(patch.id, (s) => ({...s, ...patch, lessons: patch.lessons ?? s.lessons}));
        }
      },
      () => this.restore(before),
    );
  }

  private restore(course: CourseDetailDto): void {
    this.outline.set(course);
    this.courseChange.emit(course);
  }

  // -- State plumbing ------------------------------------------------------

  private mutate(
    request: Observable<unknown>,
    logKey: string,
    onOk: (res: unknown) => void,
    onError?: () => void,
  ): void {
    this.busy.set(true);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: onOk,
      error: (err: unknown) => {
        onError?.();
        logApiError(`lms.outline.${logKey}`, err);
        this.toast.addApiError(err, this.ui().actionFailedToast);
        if (this.addingLessonIn() !== null || this.addingSection() || this.renaming() !== null) {
          this.focusInput(); // keep the typed text editable without a click
        }
      },
    });
  }

  private patchCourse(fn: (c: CourseDetailDto) => CourseDetailDto): void {
    const next = fn(this.outline());
    this.outline.set(next);
    this.courseChange.emit(next);
  }

  private patchSection(id: number, fn: (s: SectionDto) => SectionDto): void {
    this.patchCourse((c) => ({...c, sections: (c.sections ?? []).map((s) => (s.id === id ? fn(s) : s))}));
  }

  /** Applies ``fn`` to the section or lesson designated by ``ref``. */
  private patchRow(
    ref: OutlineRef,
    fn: <T extends SectionDto | LessonSummaryDto>(row: T) => T,
  ): void {
    if (ref.kind === 'section') {
      this.patchSection(ref.id, (s) => fn(s));
      return;
    }
    this.patchCourse((c) => ({
      ...c,
      sections: (c.sections ?? []).map((s) =>
        s.lessons?.some((l) => l.id === ref.id)
          ? {...s, lessons: s.lessons.map((l) => (l.id === ref.id ? fn(l) : l))}
          : s,
      ),
    }));
  }

  /** Closes any inline input (Escape) and drops the draft. */
  protected cancelInline(): void {
    this.addingLessonIn.set(null);
    this.addingSection.set(false);
    this.renaming.set(null);
    this.draft.set('');
  }

  /** Only one inline input exists at a time: focus it once rendered. */
  private focusInput(): void {
    afterNextRender(
      () => {
        const el = this.host.nativeElement.querySelector<HTMLInputElement>('input.outline-input');
        el?.focus();
        el?.select();
      },
      {injector: this.injector},
    );
  }
}
