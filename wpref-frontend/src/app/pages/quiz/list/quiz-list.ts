import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {catchError, finalize, forkJoin, map, of, switchMap} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {InputTextModule} from 'primeng/inputtext';
import {TableModule} from 'primeng/table';
import {QuizListDto, QuizTemplateDto} from '../../../api/generated';
import {QuizService, QuizSubjectCreatePayload} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';
import {QuizSubjectForm} from '../subject-form/subject-form';

interface UserQuizListItem extends QuizListDto {
  earned_score: number | null;
  max_score: number | null;
  status: 'in_progress' | 'answered';
}

@Component({
  selector: 'app-quiz-list',
  imports: [
    CommonModule,
    DialogModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    QuizSubjectForm,
  ],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.scss',
})
export class QuizList implements OnInit {
  availableTemplates = signal<QuizTemplateDto[]>([]);
  managedTemplates = signal<QuizTemplateDto[]>([]);
  myQuizzes = signal<UserQuizListItem[]>([]);
  q = signal('');
  saving = signal(false);
  loading = signal(false);
  success = signal<string | null>(null);
  maxQuestions = signal<number | null>(null);
  visible = false;
  creatingTemplateId = signal<number | null>(null);

  private readonly quizService = inject(QuizService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  readonly isAdmin = this.userService.isAdmin;
  private readonly destroyRef = inject(DestroyRef);
  readonly filteredAvailableTemplates = computed(() => {
    const term = this.normalize(this.q());
    if (!term) {
      return this.availableTemplates();
    }

    return this.availableTemplates().filter((template) =>
      this.matchesSearch(term, template.title, template.description ?? '', template.mode ?? ''),
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
  readonly filteredManagedTemplates = computed(() => {
    const term = this.normalize(this.q());
    if (!term) {
      return this.managedTemplates();
    }

    return this.managedTemplates().filter((template) =>
      this.matchesSearch(term, template.title, template.description ?? '', template.mode ?? ''),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      templates: this.quizService.listTemplates(),
      quizzes: this.quizService.listQuiz({search: this.q() || undefined}),
      me: this.getCurrentUser(),
    })
      .pipe(
        switchMap(({templates, quizzes, me}) => {
          const managedTemplates = [...templates].sort((left, right) => left.title.localeCompare(right.title));
          const availableTemplates = templates.filter((template) => template.active && template.can_answer);
          const myQuizSessions = me
            ? quizzes.filter((quiz) => quiz.user === me.id)
            : [];
          const visibleMyQuizzes = myQuizSessions.filter((quiz) => quiz.started_at || quiz.ended_at);
          const answeredQuizIds = visibleMyQuizzes
            .filter((quiz) => !!quiz.ended_at)
            .map((quiz) => quiz.id);

          if (!answeredQuizIds.length) {
            return of({
              managedTemplates,
              availableTemplates,
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
                managedTemplates,
                availableTemplates,
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
        next: ({managedTemplates, availableTemplates, myQuizzes}) => {
          this.availableTemplates.set(availableTemplates);
          this.managedTemplates.set(this.isAdmin() ? managedTemplates : []);
          this.myQuizzes.set(myQuizzes);
        },
        error: (err: unknown) => {
          console.error('Erreur lors du chargement des quizz', err);
          this.availableTemplates.set([]);
          this.managedTemplates.set([]);
          this.myQuizzes.set([]);
        },
      });
  }

  closeDialog(): void {
    this.visible = false;
  }

  onGenerate(payload: QuizSubjectCreatePayload): void {
    this.saving.set(true);
    this.success.set(null);

    this.quizService
      .generateQuiz(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (): void => {
          this.success.set('Quiz généré avec succès.');
          this.closeDialog();
          this.load();
        },
        error: (err: unknown): void => {
          console.error('Erreur génération quiz', err);
        },
      });
  }

  onSubjectsChange(ids: number[]): void {
    this.quizService
      .getQuestionCountBySubjects(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data): void => {
          this.maxQuestions.set(data.count);
        },
        error: (err: unknown): void => {
          console.error('Erreur getQuestionCountBySubjects', err);
        },
      });
  }

  goNew(): void {
    this.success.set(null);
    this.visible = true;
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

  createFromTemplate(templateId: number): void {
    this.creatingTemplateId.set(templateId);
    this.quizService
      .createQuizFromTemplate(templateId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creatingTemplateId.set(null)),
      )
      .subscribe({
        next: (quiz) => {
          this.quizService.goView(quiz.id);
        },
        error: (err: unknown) => {
          console.error('Erreur lors de la création du quiz', err);
        },
      });
  }

  goView(id: number): void {
    this.quizService.goView(id);
  }

  statusLabel(status: UserQuizListItem['status']): string {
    return status === 'answered' ? 'Répondu' : 'En cours';
  }

  private getCurrentUser() {
    const currentUser = this.userService.currentUser();
    if (currentUser) {
      return of(currentUser);
    }

    return this.userService.getMe().pipe(catchError(() => of(null)));
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
