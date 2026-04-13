import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export interface DomainStats {
  id: number;
  translations: Record<string, {name: string}>;
  members_count: number;
  managers_count: number;
  questions_count: number;
  templates_count: number;
  sessions_total: number;
  sessions_completed: number;
}

export interface DashboardStats {
  totals: {
    active_users: number;
    active_domains: number;
    active_questions: number;
    completed_sessions: number;
  };
  domains: DomainStats[];
}

@Injectable({providedIn: 'root'})
export class StatsService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBaseUrl}/stats/dashboard/`);
  }
}
