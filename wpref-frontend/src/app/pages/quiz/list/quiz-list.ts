import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {catchError, finalize, forkJoin, map, of, switchMap} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TableModule} from 'primeng/table';
import {TabsModule} from 'primeng/tabs';
import {CustomUserReadDto, QuizListDto, QuizTemplateDto} from '../../../api/generated';
import {QuizTemplateAssignDialogComponent} from '../../../components/quiz-template-assign-dialog/quiz-template-assign-dialog';
import {QuizTemplateResultsDialogComponent} from '../../../components/quiz-template-results-dialog/quiz-template-results-dialog';
import {QuizService, QuizTemplateAssignmentSessionDto} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';

interface UserQuizListItem extends QuizListDto {
  earned_score: number | null;
  max_score: number | null;
  status: 'in_progress' | 'answered';
}

type QuizTemplateListItem = QuizTemplateDto & {
  is_public?: boolean;
  created_by?: number | null;
};

@Component({
  selector: 'app-quiz-list',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TabsModule,
    QuizTemplateAssignDialogComponent,
    QuizTemplateResultsDialogComponent,
  ],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.scss',
})
export class QuizListPage implements OnInit {
  templates = signal<QuizTemplateListItem[]>([]);
  myQuizzes = signal<UserQuizListItem[]>([]);
  assignableUsers = signal<CustomUserReadDto[]>([]);
  templateSessions = signal<QuizTemplateAssignmentSessionDto[]>([]);
  activeTab = signal<'templates' | 'sessions'>('templates');
  currentUserId = signal<number | null>(null);
  q = signal('');
  loading = signal(false);
  success = signal<string | null>(null);
  creatingTemplateId = signal<number | null>(null);
  assignDialogVisible = signal(false);
  resultsDialogVisible = signal(false);
  selectedTemplate = signal<QuizTemplateListItem | null>(null);
  selectedRecipientIds = signal<number[]>([]);
  assigning = signal(false);
  resultsLoading = signal(false);

  private readonly quizService = inject(QuizService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.userService.isAdmin;

  readonly filteredCreatedTemplates = computed(() => {
    const term = this.normalize(this.q());
    return this.createdTemplates().filter((template) =>
      !term || this.matchesSearch(term, template.title, template.description ?? '', template.mode ?? ''),
    );
  });

  readonly filteredPublicTemplates = computed(() => {
    const term = this.normalize(this.q());
    return this.publicTemplates().filter((template) =>
      !term || this.matchesSearch(term, template.title, template.description ?? '', template.mode ?? ''),
    );
  });

  readonly filteredMyQuizzes = computed(() => {
    const term = this.normalize(this.q());
    if (!term) {
      return this.myQuizzes();
    }

    return this.myQuizzes().filter((quiz) =>
      this.matchesSearch(term, quiz.quiz_template_title, quiz.quiz_template_description, quiz.mode),
    );
  });

  readonly createdTemplates = computed(() => {
    const userId = this.currentUserId();
    if (!userId) {
      return [];
    }

    return this.templates()
      .filter((template) => template.created_by === userId)
      .sort((left, right) => left.title.localeCompare(right.title));
  });

  readonly publicTemplates = computed(() =>
    this.templates()
      .filter((template) => template.is_public)
      .sort((left, right) => left.title.localeCompare(right.title)),
  );

  ngOnInit(): void {
    this.load();
  }

  setActiveTab(value: string | number | undefined): void {
    this.activeTab.set(value === 'sessions' ? 'sessions' : 'templates');
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      templates: this.quizService.listTemplates(),
      quizzes: this.quizService.listQuiz(),
      me: this.getCurrentUser(),
    })
      .pipe(
        switchMap(({templates, quizzes, me}) => {
          const currentUserId = me?.id ?? null;
          const normalizedTemplates = templates as QuizTemplateListItem[];
          const myQuizSessions = me ? quizzes.filter((quiz) => quiz.user === me.id) : [];
          const visibleMyQuizzes = myQuizSessions.filter((quiz) => quiz.started_at || quiz.ended_at);
          const answeredQuizIds = visibleMyQuizzes
            .filter((quiz) => !!quiz.ended_at)
            .map((quiz) => quiz.id);

          if (!answeredQuizIds.length) {
            return of({
              currentUserId,
              templates: normalizedTemplates,
              myQuizzes: visibleMyQuizzes.map((quiz) => this.toUserQuizListItem(quiz)),
            });
          }

          return forkJoin(
            answeredQuizIds.map((quizId) =>
              this.quizService.retrieveQuiz(quizId).pipe(
                map((quiz) => ({
                  id: quizId,
                  earned_score: quiz.earned_score,
                  max_score: quiz.max_score,
                })),
                catchError(() => of({id: quizId, earned_score: null, max_score: null})),
              ),
            ),
          ).pipe(
            map((scores) => {
              const scoreByQuizId = new Map(scores.map((score) => [score.id, score]));
              return {
                currentUserId,
                templates: normalizedTemplates,
                myQuizzes: visibleMyQuizzes.map((quiz) =>
                  this.toUserQuizListItem(quiz, scoreByQuizId.get(quiz.id)),
                ),
              };
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({currentUserId, templates, myQuizzes}) => {
          this.currentUserId.set(currentUserId);
          this.templates.set(templates);
          this.myQuizzes.set(myQuizzes);
          this.loadAssignableUsers();
        },
        error: (err: unknown) => {
          logApiError('quiz.list.load', err);
          this.success.set(userFacingApiMessage(err, 'Impossible de charger les quiz.'));
          this.currentUserId.set(null);
          this.templates.set([]);
          this.myQuizzes.set([]);
        },
      });
  }

  goNew(): void {
    this.quizService.goSubject();
  }

  goCompose(): void {
    this.quizService.goCompose();
  }

  goEditTemplate(templateId: number): void {
    this.router.navigate(['/quiz/template', templateId, 'edit']);
  }

  goDeleteTemplate(templateId: number): void {
    this.router.navigate(['/quiz/template', templateId, 'delete']);
  }

  openAssignDialog(template: QuizTemplateListItem): void {
    this.selectedTemplate.set(template);
    this.selectedRecipientIds.set([]);
    this.assignDialogVisible.set(true);
    this.success.set(null);
  }

  closeAssignDialog(): void {
    this.assignDialogVisible.set(false);
    this.selectedTemplate.set(null);
    this.selectedRecipientIds.set([]);
  }

  submitAssignments(): void {
    const template = this.selectedTemplate();
    const userIds = this.selectedRecipientIds();
    if (!template || !userIds.length) {
      return;
    }

    this.assigning.set(true);
    this.quizService.assignTemplateToUsers(template.id, userIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.assigning.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.success.set(`${created.length} quiz envoye(s).`);
          this.closeAssignDialog();
          this.openResultsDialog(template);
        },
        error: (err: unknown) => {
          logApiError('quiz.list.assign-template', err);
          this.success.set(userFacingApiMessage(err, 'Impossible d envoyer ce quiz.'));
        },
      });
  }

  openResultsDialog(template: QuizTemplateListItem): void {
    this.selectedTemplate.set(template);
    this.resultsDialogVisible.set(true);
    this.resultsLoading.set(true);
    this.templateSessions.set([]);
    this.quizService.listTemplateSessions(template.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resultsLoading.set(false)),
      )
      .subscribe({
        next: (sessions) => this.templateSessions.set(sessions),
        error: (err: unknown) => {
          logApiError('quiz.list.template-results', err);
          this.success.set(userFacingApiMessage(err, 'Impossible de charger les resultats.'));
        },
      });
  }

  closeResultsDialog(): void {
    this.resultsDialogVisible.set(false);
    this.templateSessions.set([]);
  }

  createFromTemplate(templateId: number): void {
    this.creatingTemplateId.set(templateId);
    this.quizService
      .createQuizFromTemplate(templateId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creatingTemplateId.set(null)),
      )
      .subscribe({
        next: (quiz) => this.quizService.goView(quiz.id),
        error: (err: unknown) => {
          logApiError('quiz.list.create-session', err);
          this.success.set(userFacingApiMessage(err, 'Impossible de creer ce quiz.'));
        },
      });
  }

  goView(id: number): void {
    this.quizService.goView(id);
  }

  statusLabel(status: UserQuizListItem['status']): string {
    return status === 'answered' ? 'Repondu' : 'En cours';
  }

  canStartTemplate(template: QuizTemplateListItem): boolean {
    return !!template.active && !!template.can_answer;
  }

  private getCurrentUser() {
    const currentUser = this.userService.currentUser();
    if (currentUser) {
      return of(currentUser);
    }

    return this.userService.getMe().pipe(catchError(() => of(null)));
  }

  private loadAssignableUsers(): void {
    if (!this.isAdmin()) {
      this.assignableUsers.set([]);
      return;
    }

    this.userService.list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
      )
      .subscribe((users) => {
        const currentUserId = this.currentUserId();
        this.assignableUsers.set(
          users
            .filter((user) => user.id !== currentUserId)
            .sort((left, right) => left.username.localeCompare(right.username)),
        );
      });
  }

  private toUserQuizListItem(
    quiz: QuizListDto,
    score?: {earned_score: number | null; max_score: number | null},
  ): UserQuizListItem {
    return {
      ...quiz,
      earned_score: score?.earned_score ?? null,
      max_score: score?.max_score ?? null,
      status: quiz.ended_at ? 'answered' : 'in_progress',
    };
  }

  private matchesSearch(term: string, ...values: string[]): boolean {
    return values.some((value) => this.normalize(value).includes(term));
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase();
  }
}
