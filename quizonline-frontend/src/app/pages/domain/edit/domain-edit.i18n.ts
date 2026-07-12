import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import {ActionLabelsCopy} from './domain-edit-action-label.util';
import {DomainEditDurationCopy} from './domain-edit-duration.util';
import data from './domain-edit.i18n.json';

export type DomainEditUiText = {
  tabs: {
    config: string;
    notifications: string;
    invitations: string;
    members: string;
    audit: string;
    analytics: string;
  };
  audit: {
    title: string;
    empty: string;
    colWhen: string;
    colActor: string;
    colAction: string;
    colTarget: string;
    /** LOGIC — per-language audit-action dictionary; resolve via ``labelForAction``. */
    actionLabels: ActionLabelsCopy;
    systemActor: string;
    filterActionLabel: string;
    filterActionPlaceholder: string;
    filterActorLabel: string;
    filterActorPlaceholder: string;
    filterSinceLabel: string;
    filterUntilLabel: string;
    filterClear: string;
    pageReport: string;
  };
  analytics: {
    title: string;
    loading: string;
    empty: string;
    pendingCount: string;
    approvedCount: string;
    rejectedCount: string;
    cancelledCount: string;
    totalDecisions: string;
    acceptRate: string;
    acceptRateUnknown: string;
    medianDecision: string;
    medianDecisionUnknown: string;
    topDecidersTitle: string;
    topDecidersEmpty: string;
    colDecider: string;
    colDecisionCount: string;
    /** PLURAL — decision count; render through ``plural``. */
    decisionsLabel: PluralForms;
    /** LOGIC — duration copy; format via ``formatDomainEditDuration``. */
    durationFormat: DomainEditDurationCopy;
    rangeLabel: string;
    range7d: string;
    range30d: string;
    range90d: string;
    rangeAll: string;
    exportCsv: string;
    exportError: string;
  };
  errors: {
    invalidId: string;
    loadDomainFailed: string;
    formInvalid: string;
    needOneLanguage: string;
    saveFailed: string;
    translationFailed: string;
  };
  notificationSettings: {
    title: string;
    subtitle: string;
  };
  members: {
    pendingTitle: string;
    pendingNone: string;
    pendingOpenModeration: string;
    colUser: string;
    colEmail: string;
    colRequestedAt: string;
    colRole: string;
    colActions: string;
    membersTitle: string;
    membersNone: string;
    roleOwner: string;
    roleManager: string;
    roleMember: string;
    promote: string;
    demote: string;
    remove: string;
    confirmRemoveHeader: string;
    /** INTERP — carries ``{username}``; render through ``interp``. */
    confirmRemoveMessage: string;
    confirmRemoveAccept: string;
    confirmRemoveCancel: string;
    actionFailed: string;
    inviteButton: string;
    inviteDialogTitle: string;
    inviteDialogHint: string;
    inviteEmailsLabel: string;
    inviteEmailsPlaceholder: string;
    inviteSubmit: string;
    inviteCancel: string;
    /** INTERP — carries ``{email}``; render through ``interp``. */
    inviteResultSent: string;
    /** INTERP — carries ``{email}``; render through ``interp``. */
    inviteResultAlreadyMember: string;
    /** INTERP — carries ``{email}``; render through ``interp``. */
    inviteResultInvalid: string;
    /** INTERP — carries ``{email}``; render through ``interp``. */
    inviteResultForbidden: string;
    /** PLURAL — invite summary; render through ``plural`` with ``{total}``. */
    inviteResultSummary: PluralForms;
    inviteAdditionalDomainsLabel: string;
    inviteAdditionalDomainsHint: string;
    inviteAdditionalDomainsPlaceholder: string;
    /** INTERP — carries ``{domainName}``; render through ``interp``. */
    inviteResultDomainPrefix: string;
    invitationsTitle: string;
    invitationsEmpty: string;
    invitationsColEmail: string;
    invitationsColSentAt: string;
    invitationsColExpiresAt: string;
    invitationResend: string;
    invitationRevoke: string;
    invitationConfirmRevokeHeader: string;
    /** INTERP — carries ``{email}``; render through ``interp``. */
    invitationConfirmRevokeMessage: string;
    invitationConfirmRevokeAccept: string;
    invitationConfirmRevokeCancel: string;
  };
  transfer: {
    button: string;
    dialogTitle: string;
    dialogHint: string;
    pickPlaceholder: string;
    submit: string;
    sending: string;
    cancel: string;
    successMessage: string;
    errorAlreadyOwner: string;
    errorTargetUnreachable: string;
    errorGeneric: string;
    /** INTERP — carries ``{username}``; render through ``interp``. */
    pendingTo: string;
  };
  notifications: {
    readOnlyForManagers: string;
  };
};

const DICT = data as Record<string, DomainEditUiText>;

export function getDomainEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainEditUiText {
  return DICT[lang as string] ?? DICT[LanguageEnumDto.En];
}
