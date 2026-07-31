import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

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

export function getTransferAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): TransferAcceptUiText {
  return pageUiText<TransferAcceptUiText>('transferAccept', lang);
}
