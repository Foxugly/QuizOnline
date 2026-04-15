import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {adminApiBaseUrl} from './_common';

export type SystemConfigSectionLabel = 'db' | 'email' | 'upload' | 'deepl';
export type SystemCheckStatus = 'ok' | 'error' | 'skipped';

export interface SystemConfigSection {
  label: SystemConfigSectionLabel;
  values: Record<string, string | number | boolean>;
}

export interface SystemConfigResponse {
  sections: SystemConfigSection[];
}

export interface SystemCheckResponse {
  target: SystemConfigSectionLabel;
  status: SystemCheckStatus;
  detail: string;
  checked_at: string;
}

@Injectable({providedIn: 'root'})
export class SystemConfigService {
  private readonly apiBaseUrl = adminApiBaseUrl();
  private readonly http = inject(HttpClient);

  getConfig(): Observable<SystemConfigResponse> {
    return this.http.get<SystemConfigResponse>(`${this.apiBaseUrl}/admin/system-config/`);
  }

  runCheck(target: SystemConfigSectionLabel): Observable<SystemCheckResponse> {
    return this.http.post<SystemCheckResponse>(`${this.apiBaseUrl}/admin/system-check/`, {target});
  }
}
