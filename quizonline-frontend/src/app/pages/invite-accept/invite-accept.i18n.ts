import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './invite-accept.i18n.json';

export type InviteAcceptUiText = {
  title: string;
  loading: string;
  errors: {
    tokenInvalid: string;
    tokenExpired: string;
    generic: string;
    notFound: string;
  };
  states: {
    readyHeading: string;
    /** INTERP — ``{domainName}`` / ``{inviterUsername}``; render via ``interp``. */
    readyExplain: string;
    accept: string;
    accepting: string;
    accepted: string;
    alreadyMember: string;
    /** INTERP — ``{expectedEmail}``; render via ``interp``. */
    wrongAccount: string;
    loginRequired: string;
    loginCta: string;
    signupRequired: string;
    signupCta: string;
  };
  buttons: {
    backHome: string;
  };
};

const CATALOG = data as Record<string, InviteAcceptUiText>;

export function getInviteAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): InviteAcceptUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
