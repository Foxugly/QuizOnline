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
  a11y: A11yUiText;
};

export type A11yUiText = {
  skipToContent: string;
};

