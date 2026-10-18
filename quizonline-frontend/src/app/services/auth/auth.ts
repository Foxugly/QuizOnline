import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {
  defer,
  finalize,
  firstValueFrom,
  from,
  map,
  Observable,
  shareReplay,
  switchMap,
  tap,
  timeout,
} from 'rxjs';

import {CustomUserCreateRequestDto} from '../../api/generated/model/custom-user-create-request';
import {CustomUserReadDto} from '../../api/generated/model/custom-user-read';
import {EmailConfirmedTokenObtainPairRequestDto} from '../../api/generated/model/email-confirmed-token-obtain-pair-request';
import {MagicLinkExchangeResponseDto} from '../../api/generated/model/magic-link-exchange-response';
import {PasswordChangeRequestDto} from '../../api/generated/model/password-change-request';
import {PasswordChangeResponseDto} from '../../api/generated/model/password-change-response';
import {PasswordResetConfirmRequestDto} from '../../api/generated/model/password-reset-confirm-request';
import {PasswordResetRequestRequestDto} from '../../api/generated/model/password-reset-request-request';
import {TokenObtainPairDto} from '../../api/generated/model/token-obtain-pair';
import {TokenRefreshDto} from '../../api/generated/model/token-refresh';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {AccountAccessService} from '../account-access/account-access';
import {UserService} from '../user/user';
import {cookieAuthOptions} from './auth-cookie';

/** Web Locks name serialising refresh-token rotation across tabs. */
const REFRESH_LOCK = 'quizonline-token-refresh';

/**
 * Non-secret "a session exists" hint in localStorage. It tells a fresh page
 * load whether to try the silent restore, and its ``storage`` events tell the
 * other tabs "session changed" (new value) or "logged out" (removed). It never
 * carries a token: the refresh token lives in the backend's HttpOnly cookie
 * and the access token in memory only.
 */
export const SESSION_HINT_KEY = 'quizonline.session';

/** Pre-cookie storage keys. Read once for the migration, then deleted. */
export const LEGACY_REFRESH_KEY = 'refresh_token';
const LEGACY_REMEMBER_KEY = 'remember_me';

/** Upper bound on the boot-time restore, so a hung API never blocks the SPA. */
const RESTORE_TIMEOUT_MS = 10_000;

type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export type RegisterPayload = Omit<CustomUserCreateRequestDto, 'managed_domain_ids'> & {
  requested_domain_ids?: number[];
};

/** 401/403 from ``token/refresh/`` = the refresh token was rejected
 *  (expired, blacklisted, absent, foreign origin). 400 is the body-mode
 *  "malformed request" answer. Anything else (network, 5xx) is transient
 *  and keeps the session (OPERATIONS §3.25). */
export function refreshRejected(error: unknown): boolean {
  const status = (error as HttpErrorResponse | null)?.status;
  return status === 400 || status === 401 || status === 403;
}

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly USER_KEY = 'displayName';
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/v1`;

  // Memory only: a reload re-obtains it from the refresh cookie.
  private accessToken: string | null = null;
  private refresh$: Observable<TokenRefreshDto> | null = null;

  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
  private readonly accountAccess = inject(AccountAccessService);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => this.onStorage(event));
    }
  }

  get authenticated(): boolean {
    return this.isLoggedIn();
  }

  getToken(payload: EmailConfirmedTokenObtainPairRequestDto): Observable<TokenObtainPairDto> {
    return this.http.post<TokenObtainPairDto>(`${this.apiBaseUrl}/token/`, payload, cookieAuthOptions());
  }

  /**
   * Derives the user's display name — full name when available, falling back
   * to the email address. Kept language-agnostic; the empty-string case is
   * only possible for a malformed user with neither a name nor an email.
   */
  displayNameOf(
    user: {first_name?: string | null; last_name?: string | null; email?: string | null} | null | undefined,
  ): string {
    if (!user) {
      return '';
    }
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || (user.email ?? '');
  }

  /**
   * Password sign-in. ``remember`` is forwarded as ``remember_me``: unchecked,
   * the backend sets a browser-session cookie (gone when the browser closes).
   */
  login(email: string, password: string, remember = false): Observable<CustomUserReadDto> {
    const payload: EmailConfirmedTokenObtainPairRequestDto = {email, password, remember_me: remember};
    return this.getToken(payload).pipe(
      tap((dto) => this.startSession(dto.access)),
      switchMap(() => this.userService.getMe()),
      tap((user) => {
        this.setDisplayName(this.displayNameOf(user), remember);
      }),
    );
  }

  /**
   * Passwordless sign-in: exchange the e-mailed token for a session. The
   * refresh token lands in the HttpOnly cookie (persistent: "I clicked an
   * e-mail link, I expect to stay signed in").
   */
  exchangeMagicLink(token: string): Observable<CustomUserReadDto> {
    return this.http
      .post<MagicLinkExchangeResponseDto>(
        `${this.apiBaseUrl}/auth/magic-link/exchange/`,
        {token},
        cookieAuthOptions(),
      )
      .pipe(
        tap((dto) => this.startSession(dto.access)),
        switchMap(() => this.userService.getMe()),
        tap((user) => {
          this.setDisplayName(this.displayNameOf(user), true);
        }),
      );
  }

  /**
   * Obtain a fresh access token from the refresh cookie. Concurrent callers in
   * this tab share one request; across tabs the refresh is serialised with the
   * Web Locks API, so two tabs never present the same cookie (the backend
   * rotates + blacklists it on every refresh: the second would be rejected).
   * The browser sends whatever cookie is current when the request leaves, so
   * a tab that waited for the lock uses the token the other tab just rotated.
   */
  refreshTokens(): Observable<TokenRefreshDto> | null {
    if (this.refresh$) {
      return this.refresh$;
    }
    if (!this.hasSession()) {
      return null;
    }

    this.refresh$ = this.withRefreshLock(() => this.postRefresh()).pipe(
      finalize(() => {
        this.refresh$ = null;
      }),
      shareReplay(1),
    );
    return this.refresh$;
  }

  /**
   * Silent restore at boot (app initializer) and when another tab signs in:
   * refresh through the cookie, then load ``/me``. Never throws. A rejected
   * refresh ends the session; a network error / 5xx keeps the hint so the
   * next load (or the next API call) retries.
   */
  async restore(): Promise<void> {
    const refresh$ = this.refreshTokens();
    if (!refresh$) {
      return;
    }
    try {
      await firstValueFrom(refresh$.pipe(timeout(RESTORE_TIMEOUT_MS)));
      const user = await firstValueFrom(this.userService.getMe().pipe(timeout(RESTORE_TIMEOUT_MS)));
      if (!this.getDisplayName()) {
        this.setDisplayName(this.displayNameOf(user), true);
      }
      if (!this.readHint()) {
        // Migrated from a legacy stored token: start announcing the session.
        this.announceSessionChange();
      }
    } catch (error) {
      if (refreshRejected(error)) {
        this.logout();
      } else {
        // Keep the hint, but render as signed out until a later retry.
        this.accessToken = null;
      }
    }
  }

  register(payload: RegisterPayload): Observable<CustomUserReadDto> {
    return this.http.post<CustomUserReadDto>(`${this.apiBaseUrl}/user/`, payload);
  }

  /**
   * User-initiated sign-out (audit M12): the backend blacklists the refresh
   * cookie and clears it — no Bearer needed, so an expired access token
   * cannot turn it into a 401. Best effort: the local logout never waits on,
   * nor fails with, the network.
   */
  signOut(): void {
    // Under the refresh lock: a refresh running in another tab would
    // otherwise re-set a rotated cookie after the blacklist cleared it.
    this.withRefreshLock(() =>
      this.http.post(`${this.apiBaseUrl}/token/blacklist/`, {}, cookieAuthOptions()),
    ).subscribe({error: () => undefined});
    this.logout();
  }

  /** Drop the local session (memory + hint + legacy storage) and tell the other tabs. */
  logout(): void {
    this.dropMemorySession();
    this.removeEverywhere(SESSION_HINT_KEY);
    this.removeEverywhere(this.USER_KEY);
    this.dropLegacyStorage();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Whether a refresh is worth attempting: a live in-memory session, the
   * session hint, or a legacy refresh token still waiting for its migration.
   */
  hasSession(): boolean {
    return !!(this.accessToken || this.readHint() || this.legacyRefreshToken());
  }

  isLoggedIn(): boolean {
    return this.hasSession();
  }

  getDisplayName(): string {
    // Returns the empty string when nothing is stored — the caller is
    // responsible for the i18n fallback so the auth service stays
    // language-agnostic. See user-menu.html for the rendered fallback.
    return (
      localStorage.getItem(this.USER_KEY) ??
      sessionStorage.getItem(this.USER_KEY) ??
      ''
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

  /**
   * The backend revokes every refresh token on a password change and hands
   * this session a fresh pair (refresh in the cookie): adopt the access token
   * and tell the other tabs, whose cookie-backed session was just replaced.
   */
  changePassword(payload: PasswordChangeRequestDto): Observable<PasswordChangeResponseDto> {
    return this.accountAccess.changePassword(payload).pipe(
      tap((dto) => {
        if (dto.access) {
          this.startSession(dto.access);
        }
      }),
    );
  }

  private postRefresh(): Observable<TokenRefreshDto> {
    // Migration: a token left in storage by the pre-cookie SPA is presented
    // once in the body (cookie mode on, so the rotated token lands in the
    // cookie), then deleted. Read inside the lock: another tab may already
    // have migrated it.
    const legacy = this.legacyRefreshToken();
    return this.http
      .post<TokenRefreshDto>(
        `${this.apiBaseUrl}/token/refresh/`,
        legacy ? {refresh: legacy} : {},
        cookieAuthOptions(),
      )
      .pipe(
        tap({
          next: () => {
            if (legacy) this.dropLegacyStorage();
          },
          error: (error: unknown) => {
            if (legacy && refreshRejected(error)) this.dropLegacyStorage();
          },
        }),
        map((dto) => {
          this.accessToken = dto.access;
          return dto;
        }),
      );
  }

  private startSession(access: string): void {
    this.accessToken = access;
    this.dropLegacyStorage();
    this.announceSessionChange();
  }

  private dropMemorySession(): void {
    this.accessToken = null;
    this.refresh$ = null;
    this.userService.currentUser.set(null);
  }

  private onStorage(event: StorageEvent): void {
    // event.key === null <=> storage.clear() in another tab.
    if (event.key !== null && event.key !== SESSION_HINT_KEY) {
      return;
    }
    if (event.storageArea && event.storageArea !== localStorage) {
      return;
    }
    if (!event.newValue) {
      // Logged out elsewhere (the cookie is gone too): drop our copy.
      this.dropMemorySession();
      return;
    }
    // Signed in / password changed elsewhere: the shared cookie already
    // holds the new session; pick it up (access token + user).
    this.accessToken = null;
    void this.restore();
  }

  /** New hint value -> a ``storage`` event in every other tab. */
  private announceSessionChange(): void {
    try {
      localStorage.setItem(SESSION_HINT_KEY, String(Date.now()));
    } catch {
      // Storage unavailable (private mode quota): the session still works
      // in this tab, it just won't survive a reload.
    }
  }

  private readHint(): string | null {
    try {
      return localStorage.getItem(SESSION_HINT_KEY);
    } catch {
      return null;
    }
  }

  private legacyRefreshToken(): string | null {
    try {
      return localStorage.getItem(LEGACY_REFRESH_KEY) ?? sessionStorage.getItem(LEGACY_REFRESH_KEY);
    } catch {
      return null;
    }
  }

  private dropLegacyStorage(): void {
    this.removeEverywhere(LEGACY_REFRESH_KEY);
    this.removeEverywhere(LEGACY_REMEMBER_KEY);
  }

  private removeEverywhere(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Storage unavailable: nothing to remove.
    }
  }

  private setDisplayName(displayName: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(this.USER_KEY, displayName);
      return;
    }
    sessionStorage.setItem(this.USER_KEY, displayName);
  }

  private withRefreshLock<T>(work: () => Observable<T>): Observable<T> {
    const locks = (globalThis.navigator as {locks?: LockManagerLike} | undefined)?.locks;
    if (!locks?.request) {
      return defer(work);
    }
    return from(
      locks.request(REFRESH_LOCK, () =>
        new Promise<T>((resolve, reject) => {
          let last: T;
          work().subscribe({
            next: (value) => {
              last = value;
            },
            error: reject,
            complete: () => resolve(last),
          });
        }),
      ),
    );
  }
}
