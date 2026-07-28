import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {TextareaModule} from 'primeng/textarea';

import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {interp} from '../../../shared/i18n/format';
import {getCourseReviewsUiText} from './course-reviews.i18n';

interface ReviewRow {
  id: number;
  author_name: string;
  rating: number | null;
  comment: string;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
  hidden_at: string | null;
}

interface ReviewsResponse {
  reviews: ReviewRow[];
  summary: {average_rating: number | null; rating_count: number; review_count: number};
  my_review: ReviewRow | null;
  can_review: boolean;
  can_moderate: boolean;
  config: {allow_rating: boolean; allow_comment: boolean};
}

/**
 * Course reviews block for the course-detail page. Reads the composite
 * ``GET /api/v1/course/{id}/reviews/`` payload (untyped in the schema — a
 * function view — so typed locally), renders the aggregate + review list, a
 * write/edit form for eligible learners (gated by the domain's rating/comment
 * config), and hide/unhide moderation for the owner/manager.
 */
@Component({
  selector: 'app-course-reviews',
  imports: [DatePipe, FormsModule, ButtonModule, TextareaModule],
  templateUrl: './course-reviews.html',
  styleUrl: './course-reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviews implements OnInit {
  readonly courseId = input.required<number>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(AppToastService);
  protected readonly ui = inject(UiTextService).localized(getCourseReviewsUiText);
  private readonly apiBase = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  protected readonly data = signal<ReviewsResponse | null>(null);
  protected readonly loading = signal(true);

  protected readonly showForm = signal(false);
  protected readonly formRating = signal(0);
  protected readonly formComment = signal('');
  protected readonly saving = signal(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly avgStars = computed(() => Math.round(this.data()?.summary.average_rating ?? 0));

  ngOnInit(): void {
    this.load();
  }

  protected reviewsCountLabel(n: number): string {
    return interp(this.ui().reviewsCount, {count: n});
  }

  protected ratingCountLabel(n: number): string {
    return interp(this.ui().ratingCount, {count: n});
  }

  protected load(): void {
    this.loading.set(true);
    this.http.get<ReviewsResponse>(`${this.apiBase}/course/${this.courseId()}/reviews/`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        if (d.my_review) {
          this.formRating.set(d.my_review.rating ?? 0);
          this.formComment.set(d.my_review.comment);
        }
      },
      error: (err: unknown) => {
        logApiError('course.reviews.load', err);
        this.loading.set(false);
      },
    });
  }

  protected openForm(): void {
    this.showForm.set(true);
  }

  protected setRating(n: number): void {
    this.formRating.set(n);
  }

  protected submit(): void {
    const cfg = this.data()?.config;
    const body: {rating?: number | null; comment?: string} = {};
    if (cfg?.allow_rating) {
      body.rating = this.formRating() || null;
    }
    if (cfg?.allow_comment) {
      body.comment = this.formComment();
    }
    this.saving.set(true);
    this.http.put(`${this.apiBase}/course/${this.courseId()}/reviews/`, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.add({severity: 'success', summary: this.ui().savedToast});
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.addApiError(err, this.ui().errorToast);
      },
    });
  }

  protected deleteMine(): void {
    this.http.delete(`${this.apiBase}/course/${this.courseId()}/reviews/`).subscribe({
      next: () => {
        this.formRating.set(0);
        this.formComment.set('');
        this.showForm.set(false);
        this.load();
      },
      error: (err: unknown) => logApiError('course.reviews.delete', err),
    });
  }

  protected toggleHide(review: ReviewRow): void {
    this.http.post(`${this.apiBase}/review/${review.id}/moderate/`, {hidden: !review.hidden_at}).subscribe({
      next: () => this.load(),
      error: (err: unknown) => logApiError('course.reviews.moderate', err),
    });
  }
}
