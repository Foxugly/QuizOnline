import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CardModule} from 'primeng/card';
import {CheckboxModule} from 'primeng/checkbox';
import {RadioButtonModule} from 'primeng/radiobutton';
import {ButtonModule} from 'primeng/button';
import {FormsModule} from '@angular/forms';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {QuizNavItem} from '../quiz-nav/quiz-nav';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {QuestionAnswerOptionReadDto} from '../../api/generated/model/question-answer-option-read';
import {QuestionReadDto} from '../../api/generated/model/question-read';
import {UserService} from '../../services/user/user';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {NoCopyDirective} from '../../shared/directives/no-copy.directive';
import {BlockCard} from '../../shared/learning/block-card/block-card';
import {ContentBlock} from '../../shared/learning/content-block.types';

export interface AnswerPayload {
  questionId: number;
  index: number;
  selectedOptionIds: number[];
}

@Component({
  selector: 'app-quiz-question',
  templateUrl: './quiz-question.html',
  styleUrl: './quiz-question.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    CheckboxModule,
    RadioButtonModule,
    ButtonModule,
    ToggleButtonModule,
    NoCopyDirective,
    BlockCard,
  ],
})
export class QuizQuestionComponent {
  userService: UserService = inject(UserService);
  readonly editorUi = inject(UiTextService).editor;

  readonly quizNavItem = input.required<QuizNavItem>();
  readonly showCorrectAnswers = input(false);
  readonly readonlyMode = input(false);
  readonly displayMode = input<'preview' | 'exam'>('preview');
  readonly hasPrevious = input(false);
  readonly hasNext = input(false);
  readonly showFooter = input(true);
  /** When true, the quiz-flow buttons (back to quiz / finish / next-finish)
   *  render disabled because the component is embedded outside of an actual
   *  quiz session (e.g. /question/:id/view preview). */
  readonly disableQuizActions = input(false);

  readonly answeredToggled = output<void>();
  readonly flagToggled = output<boolean>();
  readonly reportRequested = output<void>();
  readonly goNext = output<AnswerPayload>();
  readonly goPrevious = output<AnswerPayload>();
  readonly goBack = output<void>();
  readonly finish = output<AnswerPayload>();
  readonly selectionChanged = output<AnswerPayload>();

  readonly currentLang = computed<LanguageEnumDto>(() => this.userService.lang() ?? LanguageEnumDto.Fr);
  selectedOptionIds: number[] = [];
  selectedRadioId: number | null = null;

  constructor() {
    effect(() => {
      const item = this.quizNavItem();
      const ids = item.selectedOptionIds ?? [];
      this.selectedOptionIds = [...ids];
      this.selectedRadioId = ids.length ? ids[0] : null;
    });
  }

  get question(): QuestionReadDto {
    return this.quizNavItem().question;
  }

  get allowMultiple(): boolean {
    const q = this.quizNavItem().question;
    if (q.allow_multiple_correct) {
      return true;
    }
    // Defensive: the editor derives allow_multiple_correct from the
    // correct-count at save time, but a question may also arrive via
    // CSV import or direct API POST with a stale flag. When is_correct
    // is exposed (preview / review / practice with correction), trust
    // the live count over the stored flag.
    const correctCount = (q.answer_options ?? []).filter(o => o.is_correct === true).length;
    return correctCount > 1;
  }

  onSelectRadio(optionId: number | null): void {
    if (this.readonlyMode()) {
      return;
    }
    this.selectedRadioId = optionId;
    this.selectedOptionIds = optionId == null ? [] : [optionId];
    this.selectionChanged.emit(this.buildPayload());
  }

  onNextClick(): void {
    if (this.readonlyMode()) {
      if (this.hasNext()) {
        this.goNext.emit(this.buildPayload());
        return;
      }
      this.finish.emit(this.buildPayload());
      return;
    }
    const payload = this.buildPayload();
    if (this.hasNext()) {
      this.goNext.emit(payload);
      return;
    }
    this.finish.emit(payload);
  }

  onPreviousClick(): void {
    this.goPrevious.emit(this.buildPayload());
  }

  onBackClick(): void {
    this.goBack.emit();
  }

  onFinishClick(): void {
    if (this.readonlyMode()) {
      return;
    }
    this.finish.emit(this.buildPayload());
  }

  onToggleCheckbox(optionId: number | undefined, checked: boolean): void {
    if (this.readonlyMode()) {
      return;
    }
    if (optionId == null) {
      return;
    }

    if (checked) {
      if (!this.selectedOptionIds.includes(optionId)) {
        this.selectedOptionIds = [...this.selectedOptionIds, optionId];
      }
    } else {
      this.selectedOptionIds = this.selectedOptionIds.filter(id => id !== optionId);
    }

    this.selectionChanged.emit(this.buildPayload());
  }

  isChecked(optionId?: number): boolean {
    if (optionId == null) {
      return false;
    }

    const source = this.readonlyMode()
      ? (this.quizNavItem()?.selectedOptionIds ?? this.selectedOptionIds)
      : this.selectedOptionIds;

    return source.includes(optionId);
  }

  isCorrectOption(option: QuestionAnswerOptionReadDto): boolean {
    return option.is_correct === true;
  }

  hasCorrection(option: QuestionAnswerOptionReadDto): boolean {
    return option.is_correct === true || option.is_correct === false;
  }

  isSelectedWrongOption(option: QuestionAnswerOptionReadDto): boolean {
    return this.hasCorrection(option) && this.isChecked(option.id) && !this.isCorrectOption(option);
  }

  answerLineClass(option: QuestionAnswerOptionReadDto): string {
    if (this.canShowCorrectionState() && this.hasCorrection(option) && this.isCorrectOption(option)) {
      return 'answer-line answer-line--correct';
    }

    if (this.canShowCorrectionState() && this.isSelectedWrongOption(option)) {
      return 'answer-line answer-line--wrong';
    }

    if (this.readonlyMode()) {
      return 'answer-line answer-line--readonly';
    }

    return 'answer-line';
  }

  protected getT(question: QuestionReadDto): any {
    const lang: LanguageEnumDto = this.currentLang();
    const translations: any = question.translations;
    return translations?.[lang] ?? Object.values(translations ?? {})[0] ?? null;
  }

  protected getTitle(question: QuestionReadDto): string {
    return this.getT(question)?.title?.trim() ?? '';
  }

  /**
   * Polymorphic prompt blocks. Phase 3 moved the question's prompt
   * (formerly the parler-translated ``description`` rich-text) onto a
   * polymorphic block list — ``QuestionRead.prompt_blocks`` carries
   * the array. We surface it as ``ContentBlock[]`` so ``<app-block-card>``
   * (the same renderer the learner lesson view uses) can dispatch to
   * each per-type renderer.
   */
  protected promptBlocks(question: QuestionReadDto): ContentBlock[] {
    return ((question as unknown as { prompt_blocks?: ContentBlock[] }).prompt_blocks ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Polymorphic explanation blocks — same mechanism as the prompt. */
  protected explanationBlocks(question: QuestionReadDto): ContentBlock[] {
    return ((question as unknown as { explanation_blocks?: ContentBlock[] }).explanation_blocks ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Block list attached to a single answer option. Phase 3 moved the
   *  per-answer content (formerly ``AnswerOption.content`` rich-text)
   *  onto the GenericForeignKey block host. */
  protected answerBlocks(option: QuestionAnswerOptionReadDto): ContentBlock[] {
    const blocks = (option as unknown as { blocks?: ContentBlock[] }).blocks ?? [];
    return blocks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  protected canShowCorrectionState(): boolean {
    // Trust the backend's answer_correctness_state ("full" → showCorrectAnswers=true)
    // regardless of displayMode. This covers practice mode mid-quiz too.
    return this.showCorrectAnswers() || this.readonlyMode();
  }

  private buildPayload(): AnswerPayload {
    return {
      questionId: this.question.id,
      index: this.quizNavItem().index,
      selectedOptionIds: this.selectedOptionIds,
    };
  }
}
