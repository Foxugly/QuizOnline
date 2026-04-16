import {Component, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ButtonModule} from 'primeng/button';

import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';

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

  template = signal<QuizTemplateDto | null>(null);
  error = signal<string | null>(null);
  templateId = 0;

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('templateId');
    const templateId = Number(rawId);
    if (!Number.isFinite(templateId)) {
      this.error.set('Identifiant de template invalide.');
      return;
    }

    this.templateId = templateId;
    this.quizTemplateService.retrieve(templateId).subscribe({
      next: (template) => this.template.set(template),
      error: (error) => {
        console.error(error);
        this.error.set('Impossible de charger le template.');
      },
    });
  }

  goBack(): void {
    this.quizService.goList();
  }

  confirm(): void {
    this.quizTemplateService.destroy(this.templateId).subscribe({
      next: () => this.quizService.goList(),
      error: (error) => {
        console.error(error);
        this.error.set('Suppression impossible.');
      },
    });
  }
}
