import {CommonModule} from '@angular/common';
import {Component, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {MultiSelectModule} from 'primeng/multiselect';
import {CustomUserReadDto, QuizTemplateDto} from '../../api/generated';

@Component({
  selector: 'app-quiz-template-assign-dialog',
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, MultiSelectModule],
  templateUrl: './quiz-template-assign-dialog.html',
  styleUrl: './quiz-template-assign-dialog.scss',
})
export class QuizTemplateAssignDialogComponent {
  visible = input(false);
  template = input<QuizTemplateDto | null>(null);
  users = input<CustomUserReadDto[]>([]);
  selectedRecipientIds = input<number[]>([]);
  assigning = input(false);

  visibleChange = output<boolean>();
  selectedRecipientIdsChange = output<number[]>();
  submit = output<void>();
  cancel = output<void>();

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  onRecipientsChange(value: number[] | null | undefined): void {
    this.selectedRecipientIdsChange.emit(value ?? []);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    this.submit.emit();
  }
}
