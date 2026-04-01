import {DatePipe} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {finalize} from 'rxjs';
import {Button} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {QuizDto} from '../../../api/generated';
import {QuizService} from '../../../services/quiz/quiz';
import {UserService} from '../../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';

@Component({
  selector: 'app-view',
  imports: [
    Button,
    CardModule,
    DatePipe,
  ],
  templateUrl: './quiz-view.html',
  styleUrl: './quiz-view.scss',
})
export class QuizView implements OnInit {
  id!: number;
  loading = signal(false);
  error = signal<string | null>(null);
  quizSession = signal<QuizDto | null>(null);

  private readonly route = inject(ActivatedRoute);
  private readonly quizService = inject(QuizService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  isAdmin = this.userService.isAdmin();
  readonly canReview = computed(() => {
    const session = this.quizSession();
    if (!session?.started_at) {
      return false;
    }

    return !session.can_answer;
  });

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id || Number.isNaN(this.id)) {
      this.error.set('Identifiant de quiz invalide.');
      return;
    }

    this.loadQuizSession();
  }

  goBack(): void {
    this.quizService.goList();
  }

  goStart(): void {
    this.quizService.goStart(this.id);
  }

  goQuestion(): void {
    this.quizService.goQuestion(this.id);
  }

  private loadQuizSession(): void {
    this.loading.set(true);
    this.error.set(null);

    this.quizService
      .retrieveQuiz(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (quizSession: QuizDto) => {
          this.quizSession.set(quizSession);
        },
        error: (err: unknown) => {
          logApiError('quiz.view.load-session', err);
          this.error.set(userFacingApiMessage(err, 'Impossible de charger ce quiz.'));
        },
      });
  }
}
