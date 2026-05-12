import {DatePipe, NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DialogModule} from 'primeng/dialog';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {TextareaModule} from 'primeng/textarea';
import {TooltipModule} from 'primeng/tooltip';
import {ConfirmationService} from 'primeng/api';

import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {DomainInviteResultDto} from '../../api/generated/model/domain-invite-result';
import {DomainJoinRequestReadDto} from '../../api/generated/model/domain-join-request-read';
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
export type InviteRequest = {emails: string[]};

@Component({
  selector: 'app-domain-members-tab',
  imports: [
    DatePipe,
    FormsModule,
    NgClass,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './domain-members-tab.html',
  styleUrl: './domain-members-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainMembersTab {
  readonly domain = input.required<DomainDetailDto>();
  readonly pendingRequests = input<DomainJoinRequestReadDto[]>([]);
  readonly canModerate = input<boolean>(false);
  /** True iff the current user is the owner (or a superuser): only they can
   *  change roles and remove members from this tab. Managers see read-only. */
  readonly canManage = input<boolean>(false);
  /** True iff the current user may send invitations (owner OR manager). */
  readonly canInvite = input<boolean>(false);
  /** Current user id; used to forbid acting on oneself from the tab. */
  readonly currentUserId = input<number | null>(null);
  readonly text = input.required<DomainEditUiText>();
  /** Latest invite-results to render (one row per address). Reset by the
   *  host when a new invite dialog is opened. */
  readonly inviteResults = input<DomainInviteResultDto[] | null>(null);
  readonly inviting = input<boolean>(false);

  readonly roleChange = output<MemberRoleChange>();
  readonly removeMember = output<MemberRemove>();
  readonly inviteRequest = output<InviteRequest>();

  readonly inviteDialogVisible = signal<boolean>(false);
  readonly inviteInput = signal<string>('');

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

  openInviteDialog(): void {
    this.inviteInput.set('');
    this.inviteDialogVisible.set(true);
  }

  closeInviteDialog(): void {
    this.inviteDialogVisible.set(false);
  }

  submitInvite(): void {
    const emails = this.parseEmails(this.inviteInput());
    if (!emails.length || this.inviting()) {
      return;
    }
    this.inviteRequest.emit({emails});
  }

  /** Split the textarea content on commas, semicolons, whitespace and newlines. */
  private parseEmails(raw: string): string[] {
    if (!raw) {
      return [];
    }
    const seen = new Set<string>();
    return raw
      .split(/[,;\s\n]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => {
        if (!s || seen.has(s)) {
          return false;
        }
        seen.add(s);
        return true;
      });
  }
}
