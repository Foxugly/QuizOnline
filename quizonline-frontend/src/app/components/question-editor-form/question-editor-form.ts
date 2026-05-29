import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {MultiSelectModule} from 'primeng/multiselect';
import {SelectModule} from 'primeng/select';
import {TabsModule} from 'primeng/tabs';
import {TooltipModule} from 'primeng/tooltip';

import {UiTextService} from '../../shared/i18n/ui-text.service';
import {QuestionEditorForm, getTranslationsGroup} from '../../services/question/question-editor-form';
import {LangCode} from '../../services/translation/translation';

type DomainOption = {id: number; name: string};
type SubjectOption = {code: number; name: string};

/**
 * Context card for the question editor — the part of the editor
 * that lives ABOVE the 3-tab block editor (or, in the create flow,
 * stands alone until the question gets its first ID).
 *
 * Renders:
 * - the domain / subjects / active / mode meta grid
 * - a per-language tab strip that lets the author fill the question
 *   ``title`` field for every language allowed by the domain
 *
 * The block-based content (prompt blocks, answer-option blocks,
 * explanation blocks) lives in its own ``<app-question-block-tabs>``
 * host because it can only render once the question has an id.
 * Question media used to live in this card too (legacy
 * ``QuestionMedia`` rows) — that pipeline is gone; image / video /
 * file content is now authored inside content blocks.
 *
 * Output ``submitted`` is emitted on form submit, leaving the parent
 * page in charge of POST / PATCH wiring + redirect.
 */
@Component({
  selector: 'app-question-editor-form',
  templateUrl: './question-editor-form.html',
  styleUrl: './question-editor-form.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabsModule,
    SelectModule,
    MultiSelectModule,
    CheckboxModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionEditorFormComponent {
  readonly form = input.required<QuestionEditorForm>();
  readonly tabCodes = input<LangCode[]>([]);
  readonly activeLang = input<LangCode | null | undefined>(undefined);
  readonly domainOptions = input<DomainOption[]>([]);
  readonly subjectOptions = input<SubjectOption[]>([]);
  readonly domainReadonlyLabel = input<string | null>(null);
  readonly showDomainSelect = input(true);
  readonly translating = input(false);
  readonly saving = input(false);
  readonly deleting = input(false);
  readonly submitLabel = input('');
  readonly emptyLanguagesMessage = input('');
  readonly submitError = input<string | null>(null);
  readonly practiceTooltip = input<string | null>(null);
  readonly examTooltip = input<string | null>(null);
  readonly showDeleteAction = input(false);
  readonly showDuplicateAction = input(false);
  readonly deleteLabel = input('');
  readonly duplicateLabel = input('');
  readonly ui = inject(UiTextService).editor;

  readonly tabChanged = output<string | number | undefined>();
  readonly cancelClicked = output<void>();
  readonly deleteClicked = output<void>();
  readonly duplicateClicked = output<void>();
  readonly submitted = output<void>();

  translationsGroup(): FormGroup {
    return getTranslationsGroup(this.form());
  }

  titleCtrl(lang: LangCode): FormControl<string> {
    return this.translationsGroup().get([lang, 'title']) as FormControl<string>;
  }

  hasContentContext(): boolean {
    return !this.showDomainSelect() || !!this.form().controls.domain.value;
  }

  protected readonly hasTabs = computed(() => this.tabCodes().length > 0);

  submit(): void {
    this.submitted.emit();
  }

  onTabChange(value: string | number | undefined): void {
    this.tabChanged.emit(value);
  }

  practiceTooltipText(): string | undefined {
    return this.practiceTooltip() ?? undefined;
  }

  examTooltipText(): string | undefined {
    return this.examTooltip() ?? undefined;
  }

  onCancel(): void {
    this.cancelClicked.emit();
  }

  onDelete(): void {
    this.deleteClicked.emit();
  }

  onDuplicate(): void {
    this.duplicateClicked.emit();
  }
}
