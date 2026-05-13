import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

import {DomainApi as DomainApiService} from '../../api/generated/api/domain.service';
import {DomainAnalyticsDto} from '../../api/generated/model/domain-analytics';
import {DomainAuditLogReadDto} from '../../api/generated/model/domain-audit-log-read';
import {DomainInviteReadDto} from '../../api/generated/model/domain-invite-read';
import {DomainInviteResultDto} from '../../api/generated/model/domain-invite-result';
import {DomainJoinRequestBulkResultDto} from '../../api/generated/model/domain-join-request-bulk-result';
import {DomainJoinRequestReadDto} from '../../api/generated/model/domain-join-request-read';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type JoinRequestStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

/**
 * Thin façade over the generated DomainApi that returns the shapes the
 * domain-edit page actually wants — pagination already unwrapped, void
 * for fire-and-forget calls — so the page does not have to know about
 * the raw HTTP envelope or hand-write URLs.
 */
@Injectable({providedIn: 'root'})
export class DomainEditApi {
  private readonly api = inject(DomainApiService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

  listAudit(domainId: number): Observable<DomainAuditLogReadDto[]> {
    return this.api.domainAuditList({domainId}).pipe(
      map((page) => page?.results ?? []),
    );
  }

  getAnalytics(domainId: number): Observable<DomainAnalyticsDto> {
    return this.api.domainAnalyticsRetrieve({domainId});
  }

  listInvitations(domainId: number): Observable<DomainInviteReadDto[]> {
    return this.api.domainInvitationsList({domainId}).pipe(
      map((rows) => rows ?? []),
    );
  }

  sendInvites(
    domainId: number,
    emails: string[],
    language: LanguageEnumDto,
    additionalDomainIds: number[] = [],
  ): Observable<DomainInviteResultDto[]> {
    return this.api
      .domainInviteCreate({
        domainId,
        domainInviteRequestRequestDto: {
          emails,
          language,
          ...(additionalDomainIds.length ? {additional_domain_ids: additionalDomainIds} : {}),
        },
      })
      .pipe(map((rows) => rows ?? []));
  }

  resendInvitation(domainId: number, inviteId: number): Observable<DomainInviteReadDto> {
    // The generator types ``inviteId`` as ``string`` for these path params
    // even though the route accepts an int; stringify here so the caller
    // can keep working with numbers like everywhere else in the page.
    return this.api.domainInvitationsResendCreate({domainId, inviteId: String(inviteId)});
  }

  revokeInvitation(domainId: number, inviteId: number): Observable<void> {
    return this.api
      .domainInvitationsRevokeCreate({domainId, inviteId: String(inviteId)})
      .pipe(map(() => void 0));
  }

  proposeTransfer(domainId: number, userId: number): Observable<void> {
    return this.api
      .domainTransferCreate({
        domainId,
        domainTransferRequestRequestDto: {user_id: userId},
      })
      .pipe(map(() => void 0));
  }

  /**
   * The OpenAPI schema does not yet expose the ``?status=`` filter on the
   * join-request list endpoint, so we hand-roll the call here to keep the
   * page free of HttpClient plumbing. The backend supports the filter via
   * a query-param branch in ``DomainJoinRequestViewSet.get_queryset``.
   */
  listPendingJoinRequests(domainId: number): Observable<DomainJoinRequestReadDto[]> {
    return this.listJoinRequests(domainId, 'pending');
  }

  listJoinRequests(
    domainId: number,
    filter: JoinRequestStatusFilter,
  ): Observable<DomainJoinRequestReadDto[]> {
    const qs = filter === 'all' ? '' : `?status=${filter}`;
    const url = `${this.apiBaseUrl}/${domainId}/join-request/${qs}`;
    return this.http
      .get<{results?: DomainJoinRequestReadDto[]} | DomainJoinRequestReadDto[]>(url)
      .pipe(
        map((response) =>
          Array.isArray(response) ? response : (response?.results ?? []),
        ),
      );
  }

  approveJoinRequest(
    domainId: number,
    reqId: number,
  ): Observable<DomainJoinRequestReadDto> {
    return this.api.domainJoinRequestApproveCreate({domainId, reqId});
  }

  /**
   * The generated client does not expose the ``reason`` body for the
   * reject endpoint, so we hand-roll it like the legacy join-requests
   * page does.
   */
  rejectJoinRequest(
    domainId: number,
    reqId: number,
    reason: string,
  ): Observable<DomainJoinRequestReadDto> {
    const url = `${this.apiBaseUrl}/${domainId}/join-request/${reqId}/reject/`;
    return this.http.post<DomainJoinRequestReadDto>(url, {reason});
  }

  bulkApproveJoinRequests(
    domainId: number,
    requestIds: number[],
  ): Observable<DomainJoinRequestBulkResultDto> {
    return this.api.domainJoinRequestBulkApproveCreate({
      domainId,
      domainJoinRequestBulkApproveRequestDto: {request_ids: requestIds},
    });
  }

  bulkRejectJoinRequests(
    domainId: number,
    requestIds: number[],
    reason: string,
  ): Observable<DomainJoinRequestBulkResultDto> {
    return this.api.domainJoinRequestBulkRejectCreate({
      domainId,
      domainJoinRequestBulkRejectRequestDto: {request_ids: requestIds, reason},
    });
  }

  changeMemberRole(
    domainId: number,
    userId: number,
    makeManager: boolean,
  ): Observable<void> {
    return this.api
      .domainMemberRoleCreate({
        domainId,
        domainMemberRoleRequestDto: {
          user_id: userId,
          is_domain_manager: makeManager,
        },
      })
      .pipe(map(() => void 0));
  }

  removeMember(domainId: number, userId: number): Observable<void> {
    return this.api
      .domainMemberRoleCreate({
        domainId,
        domainMemberRoleRequestDto: {
          user_id: userId,
          remove_member: true,
        },
      })
      .pipe(map(() => void 0));
  }
}
