import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {finalize, Observable, shareReplay, switchMap, tap} from 'rxjs';

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
  private refresh$: Observable<TokenRefreshDto> | null = null;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private accountAccess: AccountAccessService,
  ) {
    // Access token is never persisted to storage (XSS risk).
    // Refresh token is kept in storage for session continuity across page reloads.
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
    // De-duplicate concurrent refreshes. After a full page reload, multiple
    // components fire API calls in parallel, each gets a 401, and each would
    // independently POST /token/refresh/. With ROTATE_REFRESH_TOKENS=True and
    // BLACKLIST_AFTER_ROTATION=True only the first POST wins; the rest hit a
    // blacklisted token and 401, which would log the user out. Sharing a
    // single in-flight refresh observable prevents that race.
    if (this.refresh$) {
      return this.refresh$;
    }

    const refresh = this.getRefreshToken();
    if (!refresh) {
      return null;
    }

    const payload: TokenRefreshRequestDto = {refresh};
    this.refresh$ = this.http
      .post<TokenRefreshDto>(`${this.apiBaseUrl}/token/refresh/`, payload)
      .pipe(
        tap((dto) => {
          // Persist the rotated refresh from the response — the original one
          // has just been blacklisted server-side.
          this.setTokens(dto.access, dto.refresh ?? refresh, this.rememberEnabled());
        }),
        finalize(() => {
          this.refresh$ = null;
        }),
        shareReplay(1),
      );
    return this.refresh$;
  }

  register(payload: CustomUserCreateRequestDto): Observable<CustomUserReadDto> {
    return this.http.post<CustomUserReadDto>(`${this.apiBaseUrl}/user/`, payload);
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.refresh$ = null;
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
    // Has either an in-memory access token or a stored refresh token that
    // the interceptor can exchange for a new access token on the next 401.
    return !!(this.accessToken || this.refreshToken);
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
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);

    sessionStorage.removeItem(this.REFRESH_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.REMEMBER_KEY);
  }

  private clearStoredTokensOnly(): void {
    localStorage.removeItem(this.REFRESH_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
  }

  private setTokens(access: string, refresh: string, remember: boolean): void {
    // Access token lives in memory only — never written to storage.
    this.accessToken = access;
    this.refreshToken = refresh;
    this.clearStoredTokensOnly();

    if (remember) {
      localStorage.setItem(this.REFRESH_KEY, refresh);
      localStorage.setItem(this.REMEMBER_KEY, '1');
      return;
    }

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
