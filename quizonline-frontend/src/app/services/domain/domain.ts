import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {map, Observable, of, shareReplay, tap} from 'rxjs';
import {ROUTES} from '../../app.routes-paths';
import {DomainApi as DomainApiService} from '../../api/generated/api/domain.service';
import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {DomainJoinRequestReadDto} from '../../api/generated/model/domain-join-request-read';
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

  /** Replace a domain's ``certificate_logo`` via multipart form-data.
   *  Single-field PATCH so DRF's parser negotiation can decode the
   *  image without forcing us to JSON-encode binary content. Mirrors
   *  the ``uploadCourseCoverImage`` pattern in CatalogService. */
  uploadCertificateLogo(domainId: number, file: File): Observable<DomainReadDto> {
    const fd = new FormData();
    fd.append('certificate_logo', file);
    return this.http.patch<DomainReadDto>(`${this.apiBaseUrl}/${domainId}/`, fd).pipe(
      tap(() => this.invalidateListCache()),
    );
  }

  /** Clear the ``certificate_logo`` field. Sends an explicit
   *  ``cover_image: null`` JSON PATCH so DRF wipes the file storage
   *  side without needing a separate "delete" endpoint. */
  clearCertificateLogo(domainId: number): Observable<DomainReadDto> {
    return this.http.patch<DomainReadDto>(
      `${this.apiBaseUrl}/${domainId}/`,
      {certificate_logo: null},
    ).pipe(
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

  /** Per-user moderation tile: aggregated counters across every domain
   *  the caller may moderate. Cached server-side 60 s with proactive
   *  invalidation, so we just forward the call. */
  moderationSummary() {
    return this.api.domainModerationSummaryList();
  }

  /** Lookup endpoint for the public invite-acceptance flow.
   *  Returns the invite state including ``invited_email`` so the
   *  unauthenticated page can prompt for sign-up vs sign-in. */
  retrieveInviteByToken(token: string) {
    return this.api.domainInviteAcceptRetrieve({token});
  }

  /** Final acceptance of a domain invitation by its signed token. */
  acceptInviteByToken(token: string) {
    return this.api.domainInviteAcceptCreate({token});
  }

  /** Lookup endpoint for the public join-request decision flow
   *  (moderator clicked an approve/reject link from the email). */
  retrieveJoinRequestDecisionByToken(token: string) {
    return this.api.domainJoinRequestDecideRetrieve({token});
  }

  /** Apply the moderator's decision (approve or reject) carried in
   *  the signed token. */
  applyJoinRequestDecisionByToken(token: string) {
    return this.api.domainJoinRequestDecideCreate({token});
  }

  /** Lookup endpoint for the public ownership-transfer-acceptance flow. */
  retrieveTransferByToken(token: string) {
    return this.api.domainTransferAcceptRetrieve({token});
  }

  /** Accept the ownership transfer signed by its token. */
  acceptTransferByToken(token: string) {
    return this.api.domainTransferAcceptCreate({token});
  }

  /** Instructor / moderator approves a single domain join request. */
  approveJoinRequest(domainId: number, reqId: number) {
    return this.api.domainJoinRequestApproveCreate({domainId, reqId});
  }

  /** Instructor / moderator rejects a single domain join request.
   *  The reject endpoint accepts an optional ``reason`` body — the
   *  current OpenAPI schema does not declare it so the generated
   *  client wrapper cannot carry it, hence the direct ``http.post``
   *  bypass. When the backend serializer is updated to expose the
   *  field, regen and swap this body in. */
  rejectJoinRequest(domainId: number, reqId: number, reason: string) {
    const url = `${this.apiBaseUrl}/${domainId}/join-request/${reqId}/reject/`;
    return this.http.post(url, {reason});
  }

  /** List the join requests for a domain, optionally filtered by
   *  status. Wraps the no-pagination endpoint that returns either a
   *  raw array or a ``{results}`` envelope. */
  listJoinRequests(
    domainId: number,
    status?: string,
  ): Observable<{results?: DomainJoinRequestReadDto[]} | DomainJoinRequestReadDto[]> {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<{results?: DomainJoinRequestReadDto[]} | DomainJoinRequestReadDto[]>(
      `${this.apiBaseUrl}/${domainId}/join-request/${qs}`,
    );
  }

  /** Bulk-approve a batch of pending join requests in one atomic call. */
  bulkApproveJoinRequests(domainId: number, requestIds: number[]) {
    return this.api.domainJoinRequestBulkApproveCreate({
      domainId,
      domainJoinRequestBulkApproveRequestDto: {request_ids: requestIds},
    });
  }

  /** Bulk-reject a batch of pending join requests with a shared reason. */
  bulkRejectJoinRequests(domainId: number, requestIds: number[], reason: string) {
    return this.api.domainJoinRequestBulkRejectCreate({
      domainId,
      domainJoinRequestBulkRejectRequestDto: {request_ids: requestIds, reason},
    });
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
