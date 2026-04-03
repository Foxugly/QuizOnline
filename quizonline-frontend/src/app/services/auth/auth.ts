import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, switchMap, tap} from 'rxjs';

import {CustomUserCreateRequestDto} from '../../api/generated/model/custom-user-create-request';
import {CustomUserReadDto} from '../../api/generated/model/custom-user-read';
import {PasswordChangeRequestDto} from '../../api/generated/model/password-change-request';
import {PasswordResetConfirmRequestDto} from '../../api/generated/model/password-reset-confirm-request';
import {PasswordResetRequestRequestDto} from '../../api/generated/model/password-reset-request-request';
import {TokenObtainPairDto} from '../../api/generated/model/token-obtain-pair';
import {TokenObtainPairRequestDto} from '../../api/generated/model/token-obtain-pair-request';
import {TokenRefreshDto} from '../../api/generated/model/token-refresh';
import {TokenRefreshRequestDto} from '../../api/generated/model/token-refresh-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {AccountAccessService} from '../account-access/account-access';
import {UserService} from '../user/user';

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly ACCESS_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'username';
  private readonly REMEMBER_KEY = 'remember_me';
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private accountAccess: AccountAccessService,
  ) {
    this.accessToken =
      localStorage.getItem(this.ACCESS_KEY) ??
      sessionStorage.getItem(this.ACCESS_KEY);

    this.refreshToken =
      localStorage.getItem(this.REFRESH_KEY) ??
      sessionStorage.getItem(this.REFRESH_KEY);
  }

  get authenticated(): boolean {
    return this.isLoggedIn();
  }

  getToken(payload: TokenObtainPairRequestDto): Observable<TokenObtainPairDto> {
    return this.http.post<TokenObtainPairDto>(`${this.apiBaseUrl}/token/`, payload);
  }

  login(username: string, password: string, remember = false): Observable<CustomUserReadDto> {
    const payload: TokenObtainPairRequestDto = {username, password};
    return this.getToken(payload).pipe(
      tap((dto) => {
        this.setTokens(dto.access, dto.refresh, remember);
        this.setUsername(username, remember);
      }),
      switchMap(() => this.userService.getMe()),
    );
  }

  refreshTokens(): Observable<TokenRefreshDto> | null {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return null;
    }

    const payload: TokenRefreshRequestDto = {refresh};
    return this.http.post<TokenRefreshDto>(`${this.apiBaseUrl}/token/refresh/`, payload).pipe(
      tap((dto) => {
        this.setTokens(dto.access, refresh, this.rememberEnabled());
      }),
    );
  }

  register(payload: CustomUserCreateRequestDto): Observable<CustomUserReadDto> {
    return this.http.post<CustomUserReadDto>(`${this.apiBaseUrl}/user/`, payload);
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.clearStoredAuth();
    this.userService.currentUser.set(null);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  isLoggedIn(): boolean {
    return !!this.accessToken;
  }

  getUsername(): string {
    return (
      localStorage.getItem(this.USER_KEY) ??
      sessionStorage.getItem(this.USER_KEY) ??
      'Utilisateur'
    );
  }

  requiresPasswordChange(user: CustomUserReadDto | null | undefined): boolean {
    return this.userService.shouldForcePasswordChange(user);
  }

  requiresEmailConfirmation(user: CustomUserReadDto | null | undefined): boolean {
    return this.userService.shouldConfirmEmail(user);
  }

  requestPasswordReset(payload: PasswordResetRequestRequestDto) {
    return this.accountAccess.requestPasswordReset(payload);
  }

  confirmPasswordReset(payload: PasswordResetConfirmRequestDto) {
    return this.accountAccess.confirmPasswordReset(payload);
  }

  confirmEmail(payload: {uid: string; token: string}) {
    return this.accountAccess.confirmEmail(payload);
  }

  changePassword(payload: PasswordChangeRequestDto) {
    return this.accountAccess.changePassword(payload);
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);

    sessionStorage.removeItem(this.ACCESS_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.REMEMBER_KEY);
  }

  private clearStoredTokensOnly(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    sessionStorage.removeItem(this.ACCESS_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
  }

  private setTokens(access: string, refresh: string, remember: boolean): void {
    this.accessToken = access;
    this.refreshToken = refresh;
    this.clearStoredTokensOnly();

    if (remember) {
      localStorage.setItem(this.ACCESS_KEY, access);
      localStorage.setItem(this.REFRESH_KEY, refresh);
      localStorage.setItem(this.REMEMBER_KEY, '1');
      return;
    }

    sessionStorage.setItem(this.ACCESS_KEY, access);
    sessionStorage.setItem(this.REFRESH_KEY, refresh);
    sessionStorage.removeItem(this.REMEMBER_KEY);
  }

  private setUsername(username: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(this.USER_KEY, username);
      return;
    }
    sessionStorage.setItem(this.USER_KEY, username);
  }

  private rememberEnabled(): boolean {
    return !!localStorage.getItem(this.REMEMBER_KEY);
  }
}
