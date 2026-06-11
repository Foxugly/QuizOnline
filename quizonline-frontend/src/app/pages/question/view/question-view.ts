import {Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {catchError, map, of, switchMap} from 'rxjs';
import {QuestionService,} from '../../../services/question/question';
import {QuizQuestionComponent} from '../../../components/quiz-question/quiz-question';
import {ButtonModule} from 'primeng/button';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {FormsModule} from '@angular/forms';
import {UserService} from '../../../services/user/user';
import {QuizNavItem} from '../../../components/quiz-nav/quiz-nav';
import {LoadingSkeleton} from '../../../shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-question-view',
  templateUrl: './question-view.html',
  styleUrl: './question-view.scss',
  imports: [CommonModule, QuizQuestionComponent, ButtonModule, ToggleButtonModule, FormsModule, LoadingSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionView implements OnInit {
  readonly editorUi = inject(UiTextService).editor;
  id!: number;
  loading = signal(false);
  error = signal<string | null>(null);
  quizNavItem = signal<QuizNavItem | null>(null);
  /** Flag pour dire au composant enfant d'afficher les bonnes réponses en vert */
  showCorrect: boolean = false;
  /** À adapter à ton système d’authentification réel */

  private route = inject(ActivatedRoute);
  private questionService = inject(QuestionService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  isAdmin = this.userService.isAdmin();

  ngOnInit(): void {
    // React to ``:questionId`` changes (view→view navigation reuses this
    // component) and switchMap the retrieve so a stale response from the
    // previous id can never overwrite the displayed question.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('questionId') ?? params.get('id'))),
        switchMap((nextId) => {
          if (!nextId || Number.isNaN(nextId)) {
            this.id = NaN;
            this.error.set(this.editorUi().pages.questionView.errors.invalidId);
            this.loading.set(false);
            return of(null);
          }
          this.id = nextId;
          this.loading.set(true);
          this.error.set(null);
          return this.questionService.retrieve(nextId).pipe(
            catchError((err) => {
              console.error('Erreur chargement question', err);
              this.error.set(this.editorUi().pages.questionView.errors.loadFailed);
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => {
        if (!q) {
          return;
        }
        this.quizNavItem.set({
          index: 1,
          id: q.id,
          answered: false,
          flagged: false,
          question: q,
        });
        this.loading.set(false);
      });
  }

  goBack(): void {
    this.questionService.goBack()
  }

  goEdit(id: number) {
    this.questionService.goEdit(id);
  }

  /** true si l'utilisateur PEUT voir les réponses (admin ou mode practice) */
  canRevealCorrect(): boolean {
    const q = this.quizNavItem();
    if (!q) return false;
    return this.isAdmin || q.question.is_mode_practice;
  }

}
