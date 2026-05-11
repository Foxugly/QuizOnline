import {Component, computed, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {QuizDto} from '../../api/generated/model/quiz';
import {VisibilityEnumDto} from '../../api/generated/model/visibility-enum';
import {UserService} from '../../services/user/user';
import {formatLocalizedDateTime} from '../../shared/i18n/date-time';

export interface QuizSummaryFact {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quiz-summary-hero',
  imports: [
    ButtonModule,
    TagModule,
  ],
  templateUrl: './quiz-summary-hero.html',
  styleUrl: './quiz-summary-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSummaryHeroComponent {
  private readonly userService = inject(UserService);
  readonly editorUi = inject(UiTextService).editor;
  readonly session = input.required<QuizDto>();
  readonly statusLabel = input.required<string>();
  readonly statusSeverity = input<'secondary' | 'success' | 'warn' | 'danger' | 'contrast' | 'info'>('secondary');
  readonly showScore = input(true);
  readonly scoreLabel = input.required<string>();
  readonly scoreMetaLabel = input.required<string>();
  readonly facts = input<QuizSummaryFact[]>([]);
  readonly canReview = input(false);

  readonly back = output();
  readonly start = output();
  readonly openQuestion = output();
  readonly downloadPdf = output();

  private readonly resultAvailableDate = computed(() => {
    const at = this.session().result_available_at;
    return at ? new Date(at) : null;
  });

  private readonly detailAvailableDate = computed(() => {
    const at = this.session().detail_available_at;
    return at ? new Date(at) : null;
  });

  readonly resultPending = computed(() => {
    if (this.session().result_visibility !== VisibilityEnumDto.Scheduled) {
      return false;
    }
    const at = this.resultAvailableDate();
    return at != null && at.getTime() > Date.now();
  });

  readonly detailPending = computed(() => {
    if (this.session().detail_visibility !== VisibilityEnumDto.Scheduled) {
      return false;
    }
    const at = this.detailAvailableDate();
    return at != null && at.getTime() > Date.now();
  });

  readonly resultAvailableLabel = computed(() => {
    const at = this.resultAvailableDate();
    return at ? formatLocalizedDateTime(at, this.userService.currentLang) : null;
  });

  readonly detailAvailableLabel = computed(() => {
    const at = this.detailAvailableDate();
    return at ? formatLocalizedDateTime(at, this.userService.currentLang) : null;
  });

  onBack(): void {
    this.back.emit();
  }

  onStart(): void {
    this.start.emit();
  }

  onOpenQuestion(): void {
    this.openQuestion.emit();
  }

  onDownloadPdf(): void {
    this.downloadPdf.emit();
  }
}
