import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './transfer-accept.i18n.json';

export type TransferAcceptUiText = {
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
    /** INTERP — ``{domainName}`` / ``{initiatorUsername}``; render via ``interp``. */
    readyExplain: string;
    accept: string;
    accepting: string;
    transferred: string;
    /** INTERP — ``{futureOwnerUsername}``; render via ``interp``. */
    wrongAccount: string;
    noLongerEligible: string;
  };
  buttons: {
    backHome: string;
  };
};

const CATALOG = data as Record<string, TransferAcceptUiText>;

export function getTransferAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): TransferAcceptUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
