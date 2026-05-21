import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {map, Observable, of, shareReplay, tap} from 'rxjs';
import {ROUTES} from '../../app.routes-paths';
import {DomainApi as DomainApiService} from '../../api/generated/api/domain.service';
import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainWriteRequestDto} from '../../api/generated/model/domain-write-request';
import {PatchedDomainPartialRequestDto} from '../../api/generated/model/patched-domain-partial-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type DomainTranslationDto = { name: string; description: string;};
export type DomainOption = { name: string; id: number };
export type DomainTranslations = Record<string, DomainTranslationDto>;

@Injectable({
  providedIn: 'root',
})
export class DomainService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

      private readonly api = inject(DomainApiService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  /** Short TTL cache for the unfiltered ``domainList()`` payload.
   *  Catalog + course-list + a few topmenu computeds all fetch the
   *  same list on mount; without this cache navigating from catalog
   *  to course-list re-hits the backend even though the data hasn't
   *  changed. 60 s is enough to absorb a tab navigation flow while
   *  staying responsive to writes — every mutation method below
   *  busts the cache outright. */
  private readonly listCacheTtlMs = 60_000;
  private listCache: {at: number; data: DomainReadDto[]} | null = null;

  list(params?: { name?: string; search?: string }): Observable<DomainReadDto[]> {
    const cached = this.listCache;
    const isFresh = !!cached && Date.now() - cached.at < this.listCacheTtlMs;
    const source$ = isFresh
      ? of(cached!.data)
      : this.api.domainList().pipe(
          map((response: any) => (response.results ?? []) as DomainReadDto[]),
          tap((data) => {
            this.listCache = {at: Date.now(), data};
          }),
          shareReplay({bufferSize: 1, refCount: true}),
        );

    return source$.pipe(
      map((domains) => {
        const nameFilter = params?.name?.trim().toLowerCase();
        const searchFilter = params?.search?.trim().toLowerCase();

        if (!nameFilter && !searchFilter) {
          return domains;
        }

        return domains.filter((domain: any) => {
          const translations = Object.values(domain.translations ?? {}) as DomainTranslationDto[];
          const haystack = translations
            .flatMap((translation) => [
              translation.name ?? '',
              translation.description ?? '',
            ])
            .join(' ')
            .toLowerCase();

          const matchesName = !nameFilter || haystack.includes(nameFilter);
          const matchesSearch = !searchFilter || haystack.includes(searchFilter);
          return matchesName && matchesSearch;
        });
      }),
    );
  }

  /** Drop the unfiltered list cache. Called from every mutation
   *  method below so the next ``list()`` reads the post-write state.
   */
  private invalidateListCache(): void {
    this.listCache = null;
  }

  availableForLinking(): Observable<DomainReadDto[]> {
    return this.http.get<DomainReadDto[]>(`${this.apiBaseUrl}/available-for-linking/`);
  }

  retrieve(domainId: number): Observable<DomainReadDto> {
    return this.api.domainRetrieve({domainId});
  }

  detail(domainId: number): Observable<DomainDetailDto> {
    return this.api.domainDetailsRetrieve({domainId});
  }

  create(payload: DomainWriteRequestDto): Observable<DomainReadDto> {
    return this.api.domainCreate({domainWriteRequestDto: payload}).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  update(domainId: number, payload: DomainWriteRequestDto): Observable<DomainReadDto> {
    return this.api.domainUpdate({domainId, domainWriteRequestDto: payload}).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  updatePartial(domainId: number, payload:PatchedDomainPartialRequestDto): Observable<DomainReadDto> {
    return this.api.domainPartialUpdate({domainId, patchedDomainPartialRequestDto: payload}).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  delete(domainId: number): Observable<void> {
    return this.api.domainDestroy({domainId}).pipe(
      tap(() => this.invalidateListCache()),
      map(() => void 0),
    );
  }

  /** Voluntary self-leave: removes the current user from the domain's members + managers. */
  leave(domainId: number): Observable<void> {
    return this.api.domainLeaveCreate({domainId}).pipe(map(() => void 0));
  }

  /** Cancel one's own pending join request on a domain. */
  cancelJoinRequest(domainId: number, reqId: number): Observable<void> {
    return this.api.domainJoinRequestCancelCreate({domainId, reqId}).pipe(map(() => void 0));
  }

  goNew(): void {
    this.router.navigate(ROUTES.domain.add());
  }

  goList(): void {
    this.router.navigate(ROUTES.domain.list());
  }

  goBack(): void {
    this.router.navigate(ROUTES.domain.list());
  }

  goEdit(domainId: number, queryParams?: Record<string, string>): void {
    this.router.navigate(ROUTES.domain.edit(domainId), {queryParams});
  }

  goDelete(domainId: number): void {
    this.router.navigate(ROUTES.domain.delete(domainId));
  }
}
