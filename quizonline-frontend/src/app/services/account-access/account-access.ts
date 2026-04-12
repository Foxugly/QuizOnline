import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {PasswordChangeRequestDto} from '../../api/generated/model/password-change-request';
import {PasswordResetConfirmRequestDto} from '../../api/generated/model/password-reset-confirm-request';
import {PasswordResetOKDto} from '../../api/generated/model/password-reset-ok';
import {PasswordResetRequestRequestDto} from '../../api/generated/model/password-reset-request-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

@Injectable({providedIn: 'root'})
export class AccountAccessService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/user`;

  constructor(private http: HttpClient) {}

  requestPasswordReset(payload: PasswordResetRequestRequestDto): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/password/reset/`, payload);
  }

  confirmPasswordReset(payload: PasswordResetConfirmRequestDto): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/password/reset/confirm/`, payload);
  }

  confirmEmail(payload: {uid: string; token: string}): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/email/confirm/`, payload);
  }

  changePassword(payload: PasswordChangeRequestDto): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/password/change/`, payload);
  }
}
