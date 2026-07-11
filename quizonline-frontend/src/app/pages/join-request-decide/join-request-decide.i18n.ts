import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './join-request-decide.i18n.json';
import {RequesterLineCopy} from './join-request-decide-recap.util';

export type JoinRequestDecideUiText = {
  title: string;
  loading: string;
  errors: {
    tokenInvalid: string;
    tokenExpired: string;
    recipientMismatch: string;
    cannotApproveAnymore: string;
    requestNotFound: string;
    generic: string;
  };
  recap: {
    /** LOGIC — conditional requester line; build via ``formatRequesterLine``. */
    requesterLine: RequesterLineCopy;
    /** INTERP — ``{domain}``; render via ``interp``. */
    domainLine: string;
    actionLineApprove: string;
    actionLineReject: string;
    /** INTERP — ``{status}``; render via ``interp``. */
    statusLine: string;
    /** INTERP — ``{username}`` / ``{when}``; render via ``interp``. */
    decidedBy: string;
    /** INTERP — ``{when}``; render via ``interp``. */
    requestedAt: string;
    /** INTERP — ``{reason}``; render via ``interp``. */
    rejectReason: string;
  };
  override: {
    bannerTitle: string;
    bannerExplain: string;
  };
  status: {
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
  };
  buttons: {
    confirmApprove: string;
    confirmReject: string;
    overrideApprove: string;
    overrideReject: string;
    backHome: string;
    submitting: string;
  };
  done: {
    approved: string;
    rejected: string;
  };
};

const CATALOG = data as Record<string, JoinRequestDecideUiText>;

export function getJoinRequestDecideUiText(
  lang: LanguageEnumDto | string | null | undefined,
): JoinRequestDecideUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
