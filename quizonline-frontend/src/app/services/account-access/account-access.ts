import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';

import {PasswordChangeRequestDto} from '../../api/generated/model/password-change-request';
import {PasswordChangeResponseDto} from '../../api/generated/model/password-change-response';
import {PasswordResetConfirmRequestDto} from '../../api/generated/model/password-reset-confirm-request';
import {PasswordResetOKDto} from '../../api/generated/model/password-reset-ok';
import {PasswordResetRequestRequestDto} from '../../api/generated/model/password-reset-request-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {cookieAuthOptions} from '../auth/auth-cookie';

@Injectable({providedIn: 'root'})
export class AccountAccessService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/v1/user`;

    private readonly http = inject(HttpClient);

  requestPasswordReset(payload: PasswordResetRequestRequestDto): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/password/reset/`, payload);
  }

  confirmPasswordReset(payload: PasswordResetConfirmRequestDto): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/password/reset/confirm/`, payload);
  }

  confirmEmail(payload: {uid: string; token: string}): Observable<PasswordResetOKDto> {
    return this.http.post<PasswordResetOKDto>(`${this.apiBaseUrl}/email/confirm/`, payload);
  }

  /** Cookie opt-in: the backend re-sets the HttpOnly refresh cookie (every
   *  previous refresh token is revoked) and returns a fresh access token. */
  changePassword(payload: PasswordChangeRequestDto): Observable<PasswordChangeResponseDto> {
    return this.http.post<PasswordChangeResponseDto>(
      `${this.apiBaseUrl}/password/change/`,
      payload,
      cookieAuthOptions(),
    );
  }
}
