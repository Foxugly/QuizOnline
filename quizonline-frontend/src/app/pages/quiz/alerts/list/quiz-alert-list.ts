import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {TagModule} from 'primeng/tag';
import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {QuizAlertService, QuizAlertThreadListDto} from '../../../../services/quiz-alert/quiz-alert';
import {UserService} from '../../../../services/user/user';
import {ROUTES} from '../../../../app.routes-paths';
import {logApiError, userFacingApiMessage} from '../../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../../shared/components/empty-state/empty-state';
import {formatLocalizedDateTime} from '../../../../shared/i18n/date-time';
import {interp} from '../../../../shared/i18n/format';
import {getQuizAlertListUiText} from './quiz-alert-list.i18n';

type AlertStatusFilter = 'all' | 'open' | 'closed';
type AlertReadFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-quiz-alert-list',
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, CardModule, InputTextModule, SelectModule, TagModule, EmptyStateComponent],
  templateUrl: './quiz-alert-list.html',
  styleUrl: './quiz-alert-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizAlertList implements OnInit {
  readonly editorUi = inject(UiTextService).editor;
  readonly pageText = inject(UiTextService).localized(getQuizAlertListUiText);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly threads = signal<QuizAlertThreadListDto[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<AlertStatusFilter>('all');
  readonly readFilter = signal<AlertReadFilter>('all');

  protected readonly routes = ROUTES;
  protected readonly statusOptions = computed(() => {
    const t = this.pageText().statusOptions;
    return [
      {label: t.all, value: 'all' as AlertStatusFilter},
      {label: t.open, value: 'open' as AlertStatusFilter},
      {label: t.closed, value: 'closed' as AlertStatusFilter},
    ];
  });
  protected readonly readOptions = computed(() => {
    const t = this.pageText().readOptions;
    return [
      {label: t.all, value: 'all' as AlertReadFilter},
      {label: t.unread, value: 'unread' as AlertReadFilter},
      {label: t.read, value: 'read' as AlertReadFilter},
    ];
  });
  private readonly quizAlertService = inject(QuizAlertService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  readonly filteredThreads = computed(() => {
    const search = this.normalize(this.search());
    const status = this.statusFilter();
    const readFilter = this.readFilter();

    return this.threads().filter((thread) => {
      if (status !== 'all' && thread.status !== status) {
        return false;
      }

      if (readFilter === 'unread' && thread.unread_count <= 0) {
        return false;
      }

      if (readFilter === 'read' && thread.unread_count > 0) {
        return false;
      }

      if (!search) {
        return true;
      }

      return this.normalize([
        thread.kind,
        thread.question_title,
        thread.counterpart_username,
        thread.quiz_template_title,
        thread.last_message_preview,
        thread.reported_language,
        String(thread.question_id ?? ''),
        String(thread.question_order ?? ''),
      ].join(' ')).includes(search);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.quizAlertService.list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (threads) => {
          this.threads.set(threads);
          this.quizAlertService.refreshUnreadCount().subscribe({error: (err) => console.error('quiz-alert refresh failed', err)});
        },
        error: (err: unknown) => {
          logApiError('quiz.alerts.list', err);
          this.error.set(userFacingApiMessage(err, this.editorUi().pages.quizAlertList.errors.loadFailed));
          this.threads.set([]);
        },
      });
  }

  statusSeverity(thread: QuizAlertThreadListDto): 'danger' | 'success' | 'contrast' {
    if (thread.unread_count > 0) {
      return 'danger';
    }
    return thread.status === 'open' ? 'success' : 'contrast';
  }

  statusLabel(thread: QuizAlertThreadListDto): string {
    const t = this.pageText().status;
    if (thread.unread_count > 0) {
      return t.unread;
    }
    return thread.status === 'open' ? t.open : t.closed;
  }

  previewText(thread: QuizAlertThreadListDto): string {
    const t = this.pageText();
    if (thread.kind !== 'assignment') {
      return thread.last_message_preview || t.noMessage;
    }

    const sanitized = (thread.last_message_preview || '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) {
      return interp(t.assignmentPreview, {title: thread.quiz_template_title});
    }

    const prefix = sanitized.endsWith('.') ? sanitized.slice(0, -1) : sanitized;
    return interp(t.assignmentPreviewWithIntro, {intro: prefix, title: thread.quiz_template_title});
  }

  protected questionPrefixText(id: number): string {
    return interp(this.pageText().questionPrefix, {id});
  }

  protected questionOrderText(order: number): string {
    return interp(this.pageText().questionOrder, {order});
  }

  formatThreadDate(value: string): string {
    return formatLocalizedDateTime(value, this.currentLang(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) ?? value;
  }

  private currentLang(): LanguageEnumDto {
    return this.userService.currentLang ?? LanguageEnumDto.En;
  }

  private normalize(value: string): string {
    return value.toLocaleLowerCase().trim();
  }
}
