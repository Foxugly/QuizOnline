import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import type {AdminUiText} from './types/admin';
import type {
  ChangePasswordUiText,
  LoginUiText,
  RegisterPendingUiText,
  RegisterUiText,
} from './types/auth';
import type {
  FooterUiText,
  HomeUiText,
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
  preferences: PreferencesUiText;
  admin: AdminUiText;
};

