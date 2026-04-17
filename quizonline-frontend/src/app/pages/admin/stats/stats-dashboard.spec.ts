import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';

import {StatsDashboardPage} from './stats-dashboard';
import {StatsService} from '../../../services/admin/stats';
import {UserService} from '../../../services/user/user';

describe('StatsDashboardPage', () => {
  let fixture: ComponentFixture<StatsDashboardPage>;

  const mockStats = {
    totals: {active_users: 10, active_domains: 2, active_questions: 50, completed_sessions: 25},
    domains: [
      {
        id: 1,
        translations: {fr: {name: 'Test'}},
        members_count: 5,
        managers_count: 1,
        questions_count: 30,
        templates_count: 3,
        sessions_total: 20,
        sessions_completed: 15,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsDashboardPage],
      providers: [
        {
          provide: UserService,
          useValue: {currentLang: 'fr', currentUser: signal(null)},
        },
        {
          provide: StatsService,
          useValue: {getDashboard: () => of(mockStats)},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsDashboardPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load stats and build KPI cards', () => {
    expect(fixture.componentInstance.stats()).toBeTruthy();
    expect(fixture.componentInstance.kpiCards().length).toBe(4);
  });

  it('should compute completion rate', () => {
    const domain = mockStats.domains[0];
    expect(fixture.componentInstance.completionRate(domain as any)).toBe(75);
  });

  it('should build chart data', () => {
    expect(fixture.componentInstance.domainComparisonChart()).toBeTruthy();
    expect(fixture.componentInstance.sessionsDonut()).toBeTruthy();
    expect(fixture.componentInstance.completionChart()).toBeTruthy();
  });
});
