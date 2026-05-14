import {Injectable, Signal, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {QuestionReadDto} from '../../../api/generated/model/question-read';
import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {SelectedQuizQuestion} from './quiz-template-builder.models';

export interface QuizCreateCompositionBinding {
  /** Page hook called on every mutation so callers can clear stale
   * banners (e.g. the "domain change reset selection" warning). */
  readonly onMutated: () => void;
}

/**
 * Selected-questions slice of /quiz/create. Owns the working list
 * (``selectedQuestions``) and the bookkeeping signal that lets
 * ``syncWithServer`` figure out which ``QuizQuestion`` rows to
 * DELETE / PATCH / POST after the parent template has been saved.
 *
 * Sort order is canonical here: the controller renumbers on every
 * mutation so callers never have to think about it. Weights are
 * normalised to positive integers — the SPA's keyboard input wired
 * through ``onWeightChange`` would otherwise let a 0 or a fractional
 * value slip through and confuse the score-aggregation backend.
 *
 * Communication with the host happens via ``bind()``; the controller
 * does not touch the host's submit error directly, but signals back
 * through ``onMutated`` so the host can clear stale page-level
 * banners whose precondition has just changed.
 */
@Injectable()
export class QuizCreateCompositionController {
  private readonly quizTemplateService = inject(QuizTemplateService);

  private readonly _selectedQuestions = signal<SelectedQuizQuestion[]>([]);
  private readonly _originalQuizQuestionIds = signal<number[]>([]);

  readonly selectedQuestions: Signal<SelectedQuizQuestion[]> = this._selectedQuestions.asReadonly();
  readonly originalQuizQuestionIds: Signal<number[]> = this._originalQuizQuestionIds.asReadonly();

  private binding: QuizCreateCompositionBinding | null = null;

  bind(binding: QuizCreateCompositionBinding): void {
    this.binding = binding;
  }

  /** Used by the host's save flow + canSave guard. */
  count(): number {
    return this._selectedQuestions().length;
  }

  /** Returns the ids the page should send as ``quiz_questions`` on a
   * write payload — i.e. the underlying ``Question.id`` for each
   * picked row, not the ``QuizQuestion.id`` row that may or may not
   * exist yet. */
  questionIds(): number[] {
    return this._selectedQuestions().map((q) => q.question.id);
  }

  addExisting(question: QuestionReadDto): void {
    this._selectedQuestions.update((items) => [
      ...items,
      {
        question,
        weight: 1,
        sort_order: items.length + 1,
      },
    ]);
    this.binding?.onMutated();
  }

  remove(index: number): void {
    this._selectedQuestions.update((items) => {
      const next = items.filter((_, itemIndex) => itemIndex !== index);
      return this.renumber(next);
    });
    this.binding?.onMutated();
  }

  move(index: number, direction: -1 | 1): void {
    this._selectedQuestions.update((items) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) {
        return items;
      }

      const next = [...items];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return this.renumber(next);
    });
    this.binding?.onMutated();
  }

  onWeightChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const parsed = Number(target?.value ?? 1);
    const nextWeight = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;

    this._selectedQuestions.update((items) => items.map((item, itemIndex) => (
      itemIndex === index
        ? {...item, weight: nextWeight}
        : item
    )));
  }

  setWeight(index: number, value: number): void {
    const nextWeight = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    this._selectedQuestions.update((items) => items.map((item, itemIndex) => (
      itemIndex === index
        ? {...item, weight: nextWeight}
        : item
    )));
  }

  /** Wipe the working list — used by the host on "domain changed and
   * the previous selection no longer applies". */
  clear(): void {
    this._selectedQuestions.set([]);
  }

  /** Seed both signals from an existing template — typically called by
   * the host's ``patchTemplate`` flow when the page boots in edit mode. */
  hydrate(template: QuizTemplateDto): void {
    const selected = (template.quiz_questions ?? []).map((quizQuestion) => ({
      quiz_question_id: quizQuestion.id,
      question: quizQuestion.question,
      sort_order: quizQuestion.sort_order ?? 1,
      weight: quizQuestion.weight ?? 1,
    }));
    this._selectedQuestions.set(selected);
    this._originalQuizQuestionIds.set((template.quiz_questions ?? []).map((quizQuestion) => quizQuestion.id));
  }

  /** Right after a successful save on the parent template, mark the
   * current selection as the new baseline so future edits know what to
   * delete vs. patch vs. create. */
  markBaseline(): void {
    this._originalQuizQuestionIds.set(
      this._selectedQuestions()
        .map((item) => item.quiz_question_id)
        .filter((id): id is number => typeof id === 'number'),
    );
  }

  /**
   * After the parent template has been saved, dispatch DELETE / PATCH /
   * POST calls against ``/api/quiz/template/{id}/question/{qq_id}/`` so
   * the server side mirrors the in-memory selection.
   *
   * - rows present in ``originalQuizQuestionIds`` but absent from the
   *   current selection are deleted;
   * - rows already pinned to a ``quiz_question_id`` are PATCHed (sort
   *   order / weight may have changed);
   * - rows without a ``quiz_question_id`` are POSTed (newly added
   *   since the last save).
   */
  async syncWithServer(templateId: number): Promise<void> {
    const currentItems = [...this._selectedQuestions()];
    const currentIds = new Set(
      currentItems
        .map((item) => item.quiz_question_id)
        .filter((id): id is number => typeof id === 'number'),
    );

    for (const removedId of this._originalQuizQuestionIds().filter((id) => !currentIds.has(id))) {
      await firstValueFrom(this.quizTemplateService.removeQuestion(templateId, removedId));
    }

    for (const item of currentItems) {
      const payload = {
        question_id: item.question.id,
        sort_order: item.sort_order,
        weight: item.weight,
      };

      if (item.quiz_question_id) {
        await firstValueFrom(
          this.quizTemplateService.updateQuestion(templateId, item.quiz_question_id, payload),
        );
      } else {
        const created = await firstValueFrom(
          this.quizTemplateService.addQuestion(templateId, payload),
        );
        item.quiz_question_id = created.id;
      }
    }

    this._selectedQuestions.set(this.renumber(currentItems));
    this.markBaseline();
  }

  private renumber(items: SelectedQuizQuestion[]): SelectedQuizQuestion[] {
    return items.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));
  }
}
