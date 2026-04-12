import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {PasswordChangeRequest} from '../../api/generated/model/password-change-request';
import {PasswordResetConfirmRequest} from '../../api/generated/model/password-reset-confirm-request';
import {PasswordResetOK} from '../../api/generated/model/password-reset-ok';
import {PasswordResetRequestRequest} from '../../api/generated/model/password-reset-request-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

@Injectable({providedIn: 'root'})
export class AccountAccessService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/user`;

  constructor(private http: HttpClient) {}

  requestPasswordReset(payload: PasswordResetRequestRequest): Observable<PasswordResetOK> {
    return this.http.post<PasswordResetOK>(`${this.apiBaseUrl}/password/reset/`, payload);
  }

  confirmPasswordReset(payload: PasswordResetConfirmRequest): Observable<PasswordResetOK> {
    return this.http.post<PasswordResetOK>(`${this.apiBaseUrl}/password/reset/confirm/`, payload);
  }

  confirmEmail(payload: {uid: string; token: string}): Observable<PasswordResetOK> {
    return this.http.post<PasswordResetOK>(`${this.apiBaseUrl}/email/confirm/`, payload);
  }

  changePassword(payload: PasswordChangeRequest): Observable<PasswordResetOK> {
    return this.http.post<PasswordResetOK>(`${this.apiBaseUrl}/password/change/`, payload);
  }
}
