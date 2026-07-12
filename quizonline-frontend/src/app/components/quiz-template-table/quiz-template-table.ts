import {CommonModule} from '@angular/common';
import {Component, input, output, ChangeDetectionStrategy} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {TableModule} from 'primeng/table';
import {QuizTemplateListItem} from '../../pages/quiz/list/quiz-list.models';
import {TooltipModule} from 'primeng/tooltip';
import {QuizListUiText} from '../../pages/quiz/list/quiz-list.i18n';
import {interp} from '../../shared/i18n/format';

@Component({
  selector: 'app-quiz-template-table',
  imports: [CommonModule, ButtonModule, CheckboxModule, TableModule, TooltipModule],
  templateUrl: './quiz-template-table.html',
  styleUrl: './quiz-template-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizTemplateTableComponent {
  readonly templates = input<QuizTemplateListItem[]>([]);
  readonly loading = input(false);
  readonly creatingTemplateId = input<number | null>(null);
  readonly uiText = input.required<QuizListUiText>();
  readonly selection = input<QuizTemplateListItem[]>([]);

  readonly createFromTemplate = output<number>();
  readonly openAssign = output<QuizTemplateListItem>();
  readonly openResults = output<QuizTemplateListItem>();
  readonly edit = output<number>();
  readonly remove = output<number>();
  readonly selectionChange = output<QuizTemplateListItem[]>();

  emptyMessage(): string {
    return this.uiText().templates.empty;
  }

  canStartTemplate(template: QuizTemplateListItem): boolean {
    return !!template.active && !!template.can_answer;
  }

  /** When the template is "showable" — i.e. the owner has it active. We
   *  still render the play button in this case, but it is disabled when
   *  ``can_answer`` is false (typically a daterange already expired or
   *  not yet started). The tooltip on the disabled button explains
   *  which side of the window we are on. */
  shouldRenderStartButton(template: QuizTemplateListItem): boolean {
    return !!template.active;
  }

  /** Returns the tooltip string for the play button. When the button
   *  is enabled, returns the regular "Start this quiz" copy; otherwise
   *  derives the reason from ``started_at`` / ``ended_at`` so the user
   *  sees *why* the action is disabled (not yet open / closed on …). */
  startTooltip(template: QuizTemplateListItem): string {
    if (template.can_answer) {
      return this.uiText().templates.actions.start;
    }
    const now = Date.now();
    const start = template.started_at ? Date.parse(template.started_at) : NaN;
    const end = template.ended_at ? Date.parse(template.ended_at) : NaN;
    if (Number.isFinite(start) && now < start) {
      return interp(this.uiText().templates.actions.startDisabledNotYet, {when: this.formatDateTime(template.started_at)});
    }
    if (Number.isFinite(end) && now > end) {
      return interp(this.uiText().templates.actions.startDisabledExpired, {when: this.formatDateTime(template.ended_at)});
    }
    return this.uiText().templates.actions.startDisabledGeneric;
  }

  modeLabel(mode: string | null | undefined): string {
    if (mode === 'exam') {
      return this.uiText().templates.modeExam;
    }
    if (mode === 'practice') {
      return this.uiText().templates.modePractice;
    }
    return mode || '-';
  }

  boolLabel(value: boolean | null | undefined): string {
    return value ? this.uiText().templates.yes : this.uiText().templates.no;
  }

  availabilityLabel(template: QuizTemplateListItem): string {
    if (template.permanent) {
      return this.uiText().templates.permanent;
    }

    const start = this.formatDateTime(template.started_at);
    const end = this.formatDateTime(template.ended_at);

    if (start && end) {
      return `${start} - ${end}`;
    }
    if (start) {
      return `${start} -`;
    }
    if (end) {
      return `- ${end}`;
    }
    return this.uiText().templates.permanent;
  }

  createdAtLabel(template: QuizTemplateListItem): string {
    return this.formatDateTime(template.created_at);
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
