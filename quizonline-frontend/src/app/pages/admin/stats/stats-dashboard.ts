import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CardModule} from 'primeng/card';
import {ChartModule} from 'primeng/chart';
import {ProgressBarModule} from 'primeng/progressbar';
import {TableModule} from 'primeng/table';

import {DashboardStats, DomainStats, StatsService} from '../../../services/admin/stats';
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
  imports: [CardModule, ChartModule, TableModule, ProgressBarModule],
  templateUrl: './stats-dashboard.html',
  styleUrl: './stats-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly domainComparisonChart = computed(() => {
    const s = this.stats();
    const t = this.ui().admin.stats;
    if (!s || !s.domains.length) {
      return null;
    }
    const labels = s.domains.map((d) => this.domainName(d));
    return {
      data: {
        labels,
        datasets: [
          {label: t.members, data: s.domains.map((d) => d.members_count), backgroundColor: '#3b82f6'},
          {label: t.questions, data: s.domains.map((d) => d.questions_count), backgroundColor: '#10b981'},
          {label: t.templates, data: s.domains.map((d) => d.templates_count), backgroundColor: '#f59e0b'},
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {legend: {position: 'bottom' as const}},
        scales: {y: {beginAtZero: true, ticks: {precision: 0}}},
      },
    };
  });

  readonly completionChart = computed(() => {
    const s = this.stats();
    const t = this.ui().admin.stats;
    if (!s || !s.domains.length) {
      return null;
    }
    const labels = s.domains.map((d) => this.domainName(d));
    const completed = s.domains.map((d) => d.sessions_completed);
    const remaining = s.domains.map((d) => d.sessions_total - d.sessions_completed);
    return {
      data: {
        labels,
        datasets: [
          {label: t.completedSessions, data: completed, backgroundColor: '#10b981'},
          {label: t.sessions, data: remaining, backgroundColor: '#e5e7eb'},
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {legend: {position: 'bottom' as const}},
        scales: {
          x: {stacked: true, beginAtZero: true, ticks: {precision: 0}},
          y: {stacked: true},
        },
      },
    };
  });

  readonly sessionsDonut = computed(() => {
    const s = this.stats();
    const t = this.ui().admin.stats;
    if (!s) {
      return null;
    }
    const completed = s.domains.reduce((sum, d) => sum + d.sessions_completed, 0);
    const total = s.domains.reduce((sum, d) => sum + d.sessions_total, 0);
    const inProgress = total - completed;
    if (!total) {
      return null;
    }
    return {
      data: {
        labels: [t.completedSessions, t.sessions],
        datasets: [{
          data: [completed, inProgress],
          backgroundColor: ['#10b981', '#e5e7eb'],
          hoverBackgroundColor: ['#059669', '#d1d5db'],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {legend: {position: 'bottom' as const}},
      },
    };
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
