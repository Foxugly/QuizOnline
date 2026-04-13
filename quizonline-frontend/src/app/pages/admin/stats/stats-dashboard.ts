import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CardModule} from 'primeng/card';
import {ProgressBarModule} from 'primeng/progressbar';
import {TableModule} from 'primeng/table';

import {DashboardStats, DomainStats, StatsService} from '../../../services/stats/stats';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {logApiError} from '../../../shared/api/api-errors';

interface KpiCard {
  icon: string;
  value: number;
  label: string;
}

@Component({
  selector: 'app-stats-dashboard',
  imports: [CommonModule, CardModule, TableModule, ProgressBarModule],
  templateUrl: './stats-dashboard.html',
})
export class StatsDashboardPage implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ui = computed(() => getUiText(this.userService.currentLang));

  readonly stats = signal<DashboardStats | null>(null);

  readonly kpiCards = computed<KpiCard[]>(() => {
    const s = this.stats();
    const t = this.ui().admin.stats;
    if (!s) {
      return [];
    }
    return [
      {icon: 'pi pi-users', value: s.totals.active_users, label: t.activeUsers},
      {icon: 'pi pi-globe', value: s.totals.active_domains, label: t.activeDomains},
      {icon: 'pi pi-question-circle', value: s.totals.active_questions, label: t.activeQuestions},
      {icon: 'pi pi-check-circle', value: s.totals.completed_sessions, label: t.completedSessions},
    ];
  });

  ngOnInit(): void {
    this.statsService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.stats.set(data),
        error: (err: unknown) => logApiError('stats.dashboard.load', err),
      });
  }

  domainName(domain: DomainStats): string {
    const lang = this.userService.currentLang;
    const t = domain.translations;
    if (!t) {
      return `Domain #${domain.id}`;
    }
    const entry = t[lang] ?? t['fr'] ?? t['en'] ?? Object.values(t)[0];
    return entry?.name ?? `Domain #${domain.id}`;
  }

  completionRate(domain: DomainStats): number {
    if (!domain.sessions_total) {
      return 0;
    }
    return Math.round((domain.sessions_completed / domain.sessions_total) * 100);
  }
}
