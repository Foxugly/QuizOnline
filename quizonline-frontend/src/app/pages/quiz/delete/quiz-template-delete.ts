import {Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute} from '@angular/router';
import {ButtonModule} from 'primeng/button';

import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {UserService} from '../../../services/user/user';

@Component({
  selector: 'app-quiz-template-delete',
  imports: [ButtonModule],
  templateUrl: './quiz-template-delete.html',
  styleUrl: './quiz-template-delete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizTemplateDelete implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quizService = inject(QuizService);
  private readonly quizTemplateService = inject(QuizTemplateService);
  private readonly userService = inject(UserService);

  readonly ui = inject(UiTextService).editor;
  template = signal<QuizTemplateDto | null>(null);
  error = signal<string | null>(null);
  templateId = 0;

  ngOnInit(): void {
    const errors = this.ui().pages.quizTemplateDelete.errors;
    const rawId = this.route.snapshot.paramMap.get('templateId');
    const templateId = Number(rawId);
    if (!Number.isFinite(templateId)) {
      this.error.set(errors.invalidId);
      return;
    }

    this.templateId = templateId;
    this.quizTemplateService.retrieve(templateId).subscribe({
      next: (template) => this.template.set(template),
      error: (error) => {
        console.error(error);
        this.error.set(errors.loadFailed);
      },
    });
  }

  goBack(): void {
    this.quizService.goList();
  }

  confirm(): void {
    const errors = this.ui().pages.quizTemplateDelete.errors;
    this.quizTemplateService.destroy(this.templateId).subscribe({
      next: () => this.quizService.goList(),
      error: (error) => {
        console.error(error);
        this.error.set(errors.deleteFailed);
      },
    });
  }
}
