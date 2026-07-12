import {HttpClient} from '@angular/common/http';
import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {finalize, map, Observable, of, shareReplay, tap} from 'rxjs';

import {UserApi as UserApiService} from '../../api/generated/api/user.service';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {PatchedCustomUserProfileUpdateRequestDto} from '../../api/generated/model/patched-custom-user-profile-update-request';
import {CustomUserReadDto} from '../../api/generated/model/custom-user-read';
import {isSupportedLanguage, SupportedLanguage} from '../../../environments/language';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type AdminUserDto = CustomUserReadDto & {
  nb_domain_max?: number;
};

export type AdminUserCreatePayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  language?: LanguageEnumDto;
  nb_domain_max?: number;
};

export type AdminUserUpdatePayload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  language?: LanguageEnumDto;
  password?: string;
  is_active?: boolean;
  email_confirmed?: boolean;
  password_change_required?: boolean;
  nb_domain_max?: number;
};

@Injectable({providedIn: 'root'})
export class UserService {
  currentUser = signal<CustomUserReadDto | null>(null);
  requiresPasswordChange = computed(() => this.shouldForcePasswordChange());
  isAdmin = computed(() => {
    const me = this.currentUser();
    return !!me && (me.is_staff || me.is_superuser);
  });
  isSuperuser = computed(() => this.currentUser()?.is_superuser === true);

  private readonly STORAGE_KEY = 'lang';
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/user`;
  private readonly _lang = signal<SupportedLanguage>(this.loadInitialLang());
  /** Reactive language signal — prefer this over `currentLang` in templates/computeds for explicit reactivity. */
  readonly lang = this._lang.asReadonly();

  private readonly http = inject(HttpClient);
  private readonly userApi = inject(UserApiService);

  constructor() {
    effect(() => {
      document.documentElement.lang = String(this._lang());
    });
  }

  /** Getter kept for backward compat — reads the signal so consumers wrapped in `computed()` become reactive automatically. */
  get currentLang(): SupportedLanguage {
    return this._lang();
  }

  shouldForcePasswordChange(user: CustomUserReadDto | null | undefined = this.currentUser()): boolean {
    return !!user && user.password_change_required === true;
  }

  shouldConfirmEmail(user: CustomUserReadDto | null | undefined = this.currentUser()): boolean {
    return !!user && user.email_confirmed === false;
  }

  /** TTL cache for the unfiltered ``list()`` payload. Domain-edit
   *  in particular fetches the user pool to populate owner / manager
   *  pickers; once loaded the same data drives several pickers in
   *  the same session. 60 s is enough to absorb the typical edit
   *  flow without showing the author a pre-write snapshot — the
   *  admin write paths below bust the cache. */
  private readonly listCacheTtlMs = 60_000;
  private listCache: {at: number; data: CustomUserReadDto[]} | null = null;

  list(): Observable<CustomUserReadDto[]> {
    const cached = this.listCache;
    if (cached && Date.now() - cached.at < this.listCacheTtlMs) {
      return of(cached.data);
    }
    return this.http
      .get<CustomUserReadDto[] | {results?: CustomUserReadDto[]}>(`${this.apiBaseUrl}/`)
      .pipe(
        map((response) =>
          Array.isArray(response) ? response : (response.results ?? []),
        ),
        tap((data) => {
          this.listCache = {at: Date.now(), data};
        }),
        shareReplay({bufferSize: 1, refCount: true}),
      );
  }

  /** Drop the user-list cache so the next ``list()`` reads the
   *  post-write state. Wired into every admin write path below. */
  private invalidateListCache(): void {
    this.listCache = null;
  }

  listAdmin(): Observable<AdminUserDto[]> {
    return this.userApi.userList({}).pipe(
      map((response) => response.results ?? []),
    );
  }

  retrieveAdmin(userId: number): Observable<AdminUserDto> {
    return this.http.get<AdminUserDto>(`${this.apiBaseUrl}/${userId}/`);
  }

  createAdmin(payload: AdminUserCreatePayload): Observable<AdminUserDto> {
    return this.http.post<AdminUserDto>(`${this.apiBaseUrl}/`, payload).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  updateAdmin(userId: number, payload: AdminUserUpdatePayload): Observable<AdminUserDto> {
    return this.http.patch<AdminUserDto>(`${this.apiBaseUrl}/${userId}/`, payload).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  deleteAdmin(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/${userId}/`).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  setLang(lang: SupportedLanguage) {
    this._lang.set(lang);
    localStorage.setItem(this.STORAGE_KEY, String(lang));
  }

  setFromApi(lang: LanguageEnumDto | null | undefined): void {
    if (lang && isSupportedLanguage(lang)) {
      this.setLang(lang);
      return;
    }
    this.setLang(LanguageEnumDto.En);
  }

  syncLanguageFromMe(me: CustomUserReadDto) {
    if (me.language) {
      this.setLang(me.language);
    }
  }

  /** In-flight ``GET /user/me/`` shared across all concurrent callers.
   *  Several guards + the topmenu fire ``getMe()`` in parallel during a
   *  cold page load (each waiting on ``currentUser()`` to be populated);
   *  without this dedupe, the browser opens 3 identical HTTP requests
   *  and the user pays the slowest one's latency. ``shareReplay(1)``
   *  hands every subscriber the SAME response from a SINGLE request,
   *  and the ``finalize`` clears the slot so the next *fresh* cold load
   *  (e.g. after a logout/login cycle) refetches. */
  private getMe$: Observable<CustomUserReadDto> | null = null;

  getMe(): Observable<CustomUserReadDto> {
    if (this.getMe$) {
      return this.getMe$;
    }
    this.getMe$ = this.http.get<CustomUserReadDto>(`${this.apiBaseUrl}/me/`).pipe(
      tap((me) => {
        this.currentUser.set(me);
        this.syncLanguageFromMe(me);
      }),
      finalize(() => {
        this.getMe$ = null;
      }),
      shareReplay(1),
    );
    return this.getMe$;
  }

  /**
   * Returns the cached current user if we already have one, otherwise fetches
   * from /user/me/. Use this in pages that need the current user but don't
   * want to thrash the API every time the page is mounted.
   */
  currentUserOrFetch(): Observable<CustomUserReadDto> {
    const cached = this.currentUser();
    return cached ? of(cached) : this.getMe();
  }

  updateMeLanguage(language: LanguageEnumDto): Observable<CustomUserReadDto> {
    return this.updateMeProfile({language}).pipe(
      tap((me) => this.syncLanguageFromMe(me)),
    );
  }

  updateMeProfile(payload: PatchedCustomUserProfileUpdateRequestDto): Observable<CustomUserReadDto> {
    return this.http.patch<CustomUserReadDto>(`${this.apiBaseUrl}/me/`, payload).pipe(
      tap((me) => {
        this.currentUser.set(me);
        this.syncLanguageFromMe(me);
      }),
    );
  }

  /** GDPR data export — full per-user data dump as a JSON payload the
   *  caller serialises and offers as a download. */
  exportMe() {
    return this.userApi.userMeExportRetrieve();
  }

  /** Account self-deletion ("delete my account" affordance on the
   *  preferences page). Routes through the generated client. */
  deleteMe() {
    return this.userApi.userMeDestroy();
  }

  setCurrentDomain(domainId: number | null): Observable<CustomUserReadDto> {
    return this.http.post<CustomUserReadDto>(`${this.apiBaseUrl}/me/current-domain/`, {
      domain_id: domainId,
    }).pipe(
      tap((me) => {
        this.currentUser.set(me);
        this.syncLanguageFromMe(me);
      }),
    );
  }

  private loadInitialLang(): SupportedLanguage {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
    return LanguageEnumDto.En;
  }
}
