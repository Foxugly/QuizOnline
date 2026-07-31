import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

export interface DomainSubscriptionUiText {
  pageTitle: string;
  errorTitle: string;
  errorMessage: string;
  retryButton: string;
  planLabel: string;
  planFree: string;
  planPaid: string;
  membersLabel: string;
  monthlyPriceLabel: string;
  /** e.g. "excl. VAT" suffix shown next to the price. */
  vatNote: string;
  deadlineLabel: string;
  noDeadline: string;
  /** Callout copy. ``{date}`` is interpolated by the component. */
  statusPaid: string;
  statusFreeNoDeadline: string;
  statusFreeActive: string; // free, deadline in the future — "free until {date}"
  statusFreeExpired: string; // free, deadline passed — "free period ended {date}"
  back: string;
}

export function getDomainSubscriptionUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainSubscriptionUiText {
  return pageUiText<DomainSubscriptionUiText>('domainSubscription', lang);
}
