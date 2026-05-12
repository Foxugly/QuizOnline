import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {UserService} from '../../../services/user/user';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {catchError, forkJoin, map, of, switchMap} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TableModule} from 'primeng/table';
import {TooltipModule} from 'primeng/tooltip';
import {QuizAssignmentListDto} from '../../../api/generated/model/quiz-assignment-list';
import {QuizTemplateListDto} from '../../../api/generated/model/quiz-template-list';
import {ROUTES} from '../../../app.routes-paths';
import {QuizService} from '../../../services/quiz/quiz';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';

@Component({
  selector: 'app-quiz-template-results-page',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TableModule, TooltipModule],
  templateUrl: './quiz-template-results.html',
  styleUrl: './quiz-template-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizTemplateResultsPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly template = signal<QuizTemplateListDto | null>(null);
  readonly sessions = signal<QuizAssignmentListDto[]>([]);
  readonly search = signal('');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  readonly editorUi = inject(UiTextService).editor;

  readonly titleHtml = computed(() => {
    const ui = this.editorUi().pages.quizTemplateResults;
    const tpl = this.template();
    if (!tpl) {
      return ui.title;
    }
    return ui.titleWithTemplate.replace('{title}', `<strong>${this.escapeHtml(tpl.title)}</strong>`);
  });

  readonly filteredSessions = computed(() => {
    const term = this.normalize(this.search());
    if (!term) {
      return this.sessions();
    }

    return this.sessions().filter((quiz) =>
      this.normalize([
        quiz.user_summary?.username,
        quiz.quiz_template_title,
        quiz.mode,
        quiz.created_at,
        quiz.started_at,
        quiz.ended_at,
        String(quiz.id),
      ].join(' ')).includes(term),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.route.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef),
      map((params) => Number(params.get('templateId'))),
      switchMap((templateId) => {
        if (!Number.isFinite(templateId) || templateId <= 0) {
          throw new Error('Invalid template id');
        }
        return forkJoin({
          sessions: this.quizService.listTemplateSessions(templateId),
          template: this.quizService.listTemplates().pipe(
            map((templates) => templates.find((item) => item.id === templateId) ?? null),
            catchError(() => of(null)),
          ),
        });
      }),
    ).subscribe({
      next: ({sessions, template}) => {
        this.sessions.set(sessions);
        this.template.set(template);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('quiz.template-results.load', err);
        this.sessions.set([]);
        this.template.set(null);
        this.error.set(userFacingApiMessage(err, this.editorUi().pages.quizTemplateResults.loadFailed));
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    void this.router.navigate(ROUTES.quiz.list());
  }

  goView(quizId: number): void {
    void this.router.navigate(ROUTES.quiz.view(quizId));
  }

  goDelete(quizId: number): void {
    const templateId = this.template()?.id ?? null;
    void this.router.navigate(ROUTES.quiz.deleteSession(quizId, templateId));
  }

  downloadPdf(quizId: number): void {
    this.quizService.exportPdf(quizId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-${quizId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => logApiError('quiz.export-pdf', err),
    });
  }

  statusLabel(quiz: QuizAssignmentListDto): string {
    const ui = this.editorUi();
    if (quiz.ended_at) {
      return ui.pages.quizTemplateResults.statusAnswered;
    }
    if (quiz.started_at) {
      return ui.quiz.statusInProgress;
    }
    return ui.pages.quizTemplateResults.statusNotStarted;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase();
  }

  exportCsv(): void {
    const rows = this.filteredSessions();
    if (!rows.length) {
      return;
    }

    const ui = this.editorUi();
    const headers = [
      ui.pages.quizTemplateResults.colUser,
      ui.pages.quizTemplateResults.csvLastName,
      ui.pages.quizTemplateResults.csvFirstName,
      ui.pages.quizTemplateResults.csvEmail,
      ui.quiz.startedOn,
      ui.quiz.closedOn,
      ui.pages.quizTemplateResults.colScore,
    ];
    const csvRows = [headers, ...rows.map((quiz) => [
      quiz.user_summary?.username ?? '',
      quiz.user_summary?.last_name ?? '',
      quiz.user_summary?.first_name ?? '',
      quiz.user_summary?.email ?? '',
      this.csvDate(quiz.started_at),
      this.csvDate(quiz.ended_at),
      this.scoreLabel(quiz),
    ])];

    const csv = csvRows
      .map((row) => row.map((cell) => this.csvEscape(cell)).join(';'))
      .join('\r\n');

    // BOM so Excel detects UTF-8 (preserves accents in column headers)
    const blob = new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const filename = `quiz-template-${this.template()?.id ?? 'results'}.csv`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: string): string {
    if (value.includes('"') || value.includes(';') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private csvDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private scoreLabel(quiz: QuizAssignmentListDto): string {
    if (quiz.earned_score == null || quiz.max_score == null) {
      return '';
    }
    return `${quiz.earned_score} / ${quiz.max_score}`;
  }
}
