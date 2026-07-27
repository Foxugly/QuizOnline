import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface BillingBannerUiText {
  /** ``{date}`` interpolated. Shown while the free period is still running. */
  approaching: string;
  /** ``{date}`` interpolated. Shown once the free period has ended. */
  expired: string;
  cta: string;
}

export function getBillingBannerUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BillingBannerUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        approaching: 'La période gratuite de ce domaine se termine le {date}.',
        expired: 'La période gratuite de ce domaine a pris fin le {date}. Merci de régulariser le paiement.',
        cta: 'Voir l’abonnement',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        approaching: 'De gratis periode van dit domein eindigt op {date}.',
        expired: 'De gratis periode van dit domein is geëindigd op {date}. Gelieve de betaling te regelen.',
        cta: 'Abonnement bekijken',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        approaching: 'Il periodo gratuito di questo dominio termina il {date}.',
        expired: 'Il periodo gratuito di questo dominio è terminato il {date}. Si prega di regolarizzare il pagamento.',
        cta: 'Vedi abbonamento',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        approaching: 'El periodo gratuito de este dominio termina el {date}.',
        expired: 'El periodo gratuito de este dominio terminó el {date}. Por favor, regulariza el pago.',
        cta: 'Ver suscripción',
      };
    default:
      return {
        approaching: 'This domain’s free period ends on {date}.',
        expired: 'This domain’s free period ended on {date}. Please arrange payment.',
        cta: 'View subscription',
      };
  }
}
