import {NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {TooltipModule} from 'primeng/tooltip';
import {ConfirmationService} from 'primeng/api';

import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {UserSummaryDto} from '../../api/generated/model/user-summary';
import {DomainEditUiText} from '../../pages/domain/edit/domain-edit.i18n';

type MemberRow = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'manager' | 'member';
};

export type MemberRoleChange = {userId: number; makeManager: boolean};
export type MemberRemove = {userId: number};
export type InviteRequest = {emails: string[]; additionalDomainIds: number[]};
export type InviteResend = {inviteId: number};
export type InviteRevoke = {inviteId: number; email: string};
export type AdditionalDomainOption = {label: string; value: number};

@Component({
  selector: 'app-domain-members-tab',
  imports: [
    NgClass,
    ButtonModule,
    ConfirmDialogModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './domain-members-tab.html',
  styleUrl: './domain-members-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainMembersTab {
  readonly domain = input.required<DomainDetailDto>();
  /** True iff the current user is the owner (or a superuser): only they can
   *  change roles and remove members from this tab. Managers see read-only. */
  readonly canManage = input<boolean>(false);
  /** Current user id; used to forbid acting on oneself from the tab. */
  readonly currentUserId = input<number | null>(null);
  readonly text = input.required<DomainEditUiText>();

  readonly roleChange = output<MemberRoleChange>();
  readonly removeMember = output<MemberRemove>();

  private readonly confirmationService = inject(ConfirmationService);

  readonly memberRows = computed<MemberRow[]>(() => {
    const d = this.domain();
    const ownerId = d.owner?.id;
    const managerIds = new Set((d.managers ?? []).map(m => m.id));
    const seen = new Set<number>();
    const rows: MemberRow[] = [];

    const push = (user: UserSummaryDto, role: MemberRow['role']) => {
      if (!user?.id || seen.has(user.id)) {
        return;
      }
      seen.add(user.id);
      rows.push({
        id: user.id,
        username: user.username,
        email: user.email ?? '',
        firstName: user.first_name ?? '',
        lastName: user.last_name ?? '',
        role,
      });
    };

    if (d.owner) {
      push(d.owner, 'owner');
    }
    for (const m of d.managers ?? []) {
      push(m, ownerId === m.id ? 'owner' : 'manager');
    }
    for (const m of d.members ?? []) {
      const role: MemberRow['role'] =
        ownerId === m.id ? 'owner' : managerIds.has(m.id) ? 'manager' : 'member';
      push(m, role);
    }
    return rows;
  });

  roleLabel(role: MemberRow['role']): string {
    const labels = this.text().members;
    switch (role) {
      case 'owner':
        return labels.roleOwner;
      case 'manager':
        return labels.roleManager;
      default:
        return labels.roleMember;
    }
  }

  /** Whether the current user may act on this row. Owners cannot be touched
   *  from the UI (must transfer ownership instead), and you can never act
   *  on yourself from this surface. */
  canActOnRow(row: MemberRow): boolean {
    if (!this.canManage()) {
      return false;
    }
    if (row.role === 'owner') {
      return false;
    }
    const me = this.currentUserId();
    return me == null || row.id !== me;
  }

  promote(row: MemberRow): void {
    if (!this.canActOnRow(row) || row.role !== 'member') {
      return;
    }
    this.roleChange.emit({userId: row.id, makeManager: true});
  }

  demote(row: MemberRow): void {
    if (!this.canActOnRow(row) || row.role !== 'manager') {
      return;
    }
    this.roleChange.emit({userId: row.id, makeManager: false});
  }

  confirmRemove(row: MemberRow): void {
    if (!this.canActOnRow(row)) {
      return;
    }
    const labels = this.text().members;
    this.confirmationService.confirm({
      header: labels.confirmRemoveHeader,
      message: labels.confirmRemoveMessage(row.username),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmRemoveAccept,
      rejectLabel: labels.confirmRemoveCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.removeMember.emit({userId: row.id}),
    });
  }
}
