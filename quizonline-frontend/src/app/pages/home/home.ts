import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {Router, RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';

import {ModerationSummaryItemDto} from '../../api/generated/model/moderation-summary-item';
import {ROUTES} from '../../app.routes-paths';
import {AuthService} from '../../services/auth/auth';
import {DomainService} from '../../services/domain/domain';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';
import {openContactEmail} from '../../shared/contact';
import {interp, plural} from '../../shared/i18n/format';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  readonly app = window.__APP__!;
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly ui = inject(UiTextService).ui;

  readonly isAuthenticated = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = this.userService.isAdmin;
  readonly primaryCta = computed(() =>
    this.isAuthenticated() ? ROUTES.quiz.list() : ROUTES.auth.login(),
  );
  readonly primaryCtaLabel = computed(() =>
    this.isAuthenticated() ? this.ui().home.primaryLoggedIn : this.ui().home.primaryLoggedOut,
  );
  readonly secondaryCta = computed(() =>
    this.isAdmin() ? ROUTES.quiz.add() : ROUTES.auth.register(),
  );
  readonly secondaryCtaLabel = computed(() =>
    this.isAdmin() ? this.ui().home.secondaryAdmin : this.ui().home.secondaryLoggedOut,
  );

  readonly moderationSummary = signal<ModerationSummaryItemDto[]>([]);
  readonly moderationTotal = computed(() =>
    this.moderationSummary().reduce((sum, item) => sum + (item.pending_count ?? 0), 0)
  );

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadModerationSummary();
    }
  }

  protected moderationSubtitle(): string {
    return interp(this.ui().home.moderationTileSubtitle, {total: this.moderationTotal()});
  }

  protected moderationCount(pending: number | undefined): string {
    return plural(this.ui().home.moderationTileCount, pending ?? 0);
  }

  goModerate(domainId: number): void {
    void this.router.navigate(['/domain', domainId, 'join-requests']);
  }

  contactClick(): void {
    openContactEmail('[TrainingManager]');
  }

  private loadModerationSummary(): void {
    this.domainService.moderationSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.moderationSummary.set(rows ?? []),
        error: (err) => {
          // The tile is best-effort: a 401/403 just hides it.
          logApiError('home.moderation-summary', err);
          this.moderationSummary.set([]);
        },
      });
  }
}
