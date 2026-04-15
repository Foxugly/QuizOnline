import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {adminApiBaseUrl} from './_common';

export interface TestEmailPayload {
  to: string;
  subject?: string;
  body?: string;
}

export interface TestEmailResponse {
  detail: string;
  email_id: number;
  recipients: string[];
  subject: string;
}

@Injectable({providedIn: 'root'})
export class MailTestService {
  private readonly apiBaseUrl = adminApiBaseUrl();

  constructor(private readonly http: HttpClient) {}

  sendTestEmail(payload: TestEmailPayload): Observable<TestEmailResponse> {
    return this.http.post<TestEmailResponse>(`${this.apiBaseUrl}/mail/test/`, payload);
  }
}
