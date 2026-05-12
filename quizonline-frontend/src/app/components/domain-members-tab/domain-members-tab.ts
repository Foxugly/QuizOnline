import {DatePipe, NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';

import {DomainDetailDto} from '../../api/generated/model/domain-detail';
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

@Component({
  selector: 'app-domain-members-tab',
  imports: [
    DatePipe,
    NgClass,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './domain-members-tab.html',
  styleUrl: './domain-members-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainMembersTab {
  readonly domain = input.required<DomainDetailDto>();
  readonly pendingRequests = input<DomainJoinRequestReadDto[]>([]);
  readonly canModerate = input<boolean>(false);
  readonly text = input.required<DomainEditUiText>();

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
}
