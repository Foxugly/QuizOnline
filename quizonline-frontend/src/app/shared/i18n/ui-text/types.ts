import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import type {AdminUiText} from './types/admin';
import type {
  ChangePasswordUiText,
  ConfirmEmailUiText,
  LoginUiText,
  RegisterPendingUiText,
  RegisterUiText,
  ResetPasswordUiText,
} from './types/auth';
import type {
  FooterUiText,
  HomeUiText,
  NotificationsUiText,
  PreferencesUiText,
  TopMenuUiText,
  UserMenuUiText,
} from './types/core';

export type UiText = {
  topmenu: TopMenuUiText;
  userMenu: UserMenuUiText;
  footer: FooterUiText;
  home: HomeUiText;
  login: LoginUiText;
  register: RegisterUiText;
  registerPending: RegisterPendingUiText;
  changePassword: ChangePasswordUiText;
  resetPassword: ResetPasswordUiText;
  confirmEmail: ConfirmEmailUiText;
  preferences: PreferencesUiText;
  notifications: NotificationsUiText;
  admin: AdminUiText;
  status: StatusUiText;
  access: AccessUiText;
  a11y: A11yUiText;
};

/** Shared state vocabulary surfaced by ``<app-status-badge>`` across every
 *  list and header. ``active``/``inactive`` = operational; ``published``/
 *  ``draft`` = publication lifecycle. */
export type StatusUiText = {
  active: string;
  inactive: string;
  published: string;
  draft: string;
};

/** Shared access-mode vocabulary — how members join a domain (``public`` +
 *  ``join_policy``) or enrol in a course (``enrollment_mode``). */
export type AccessUiText = {
  open: string;
  approval: string;
  invite: string;
};

export type A11yUiText = {
  skipToContent: string;
};

