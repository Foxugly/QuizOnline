import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

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
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Abonnement',
        errorTitle: 'Chargement impossible',
        errorMessage: "Les informations d'abonnement n'ont pas pu être chargées. Veuillez réessayer.",
        retryButton: 'Réessayer',
        planLabel: 'Formule',
        planFree: 'Gratuit',
        planPaid: 'Payant',
        membersLabel: 'Membres',
        monthlyPriceLabel: 'Prix mensuel',
        vatNote: 'HTVA',
        deadlineLabel: 'Échéance de la période gratuite',
        noDeadline: 'Aucune (gratuit sans limite)',
        statusPaid: 'Formule payante active.',
        statusFreeNoDeadline: 'Période gratuite sans échéance. Rien à payer pour le moment.',
        statusFreeActive: "Gratuit jusqu'au {date}. Au-delà, l'abonnement mensuel s'appliquera.",
        statusFreeExpired: 'La période gratuite a pris fin le {date}. Merci de régulariser le paiement.',
        back: 'Retour',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Abonnement',
        errorTitle: 'Laden mislukt',
        errorMessage: 'De abonnementsgegevens konden niet worden geladen. Probeer het opnieuw.',
        retryButton: 'Opnieuw proberen',
        planLabel: 'Plan',
        planFree: 'Gratis',
        planPaid: 'Betaald',
        membersLabel: 'Leden',
        monthlyPriceLabel: 'Maandprijs',
        vatNote: 'excl. btw',
        deadlineLabel: 'Einde van de gratis periode',
        noDeadline: 'Geen (onbeperkt gratis)',
        statusPaid: 'Betaald plan actief.',
        statusFreeNoDeadline: 'Gratis periode zonder einddatum. Voorlopig niets te betalen.',
        statusFreeActive: 'Gratis tot {date}. Daarna geldt het maandabonnement.',
        statusFreeExpired: 'De gratis periode eindigde op {date}. Gelieve de betaling te regelen.',
        back: 'Terug',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Abbonamento',
        errorTitle: 'Caricamento non riuscito',
        errorMessage: "Impossibile caricare i dati dell'abbonamento. Riprova.",
        retryButton: 'Riprova',
        planLabel: 'Piano',
        planFree: 'Gratuito',
        planPaid: 'A pagamento',
        membersLabel: 'Membri',
        monthlyPriceLabel: 'Prezzo mensile',
        vatNote: 'IVA escl.',
        deadlineLabel: 'Scadenza del periodo gratuito',
        noDeadline: 'Nessuna (gratuito illimitato)',
        statusPaid: 'Piano a pagamento attivo.',
        statusFreeNoDeadline: 'Periodo gratuito senza scadenza. Per ora nulla da pagare.',
        statusFreeActive: 'Gratuito fino al {date}. Dopo si applicherà l’abbonamento mensile.',
        statusFreeExpired: 'Il periodo gratuito è terminato il {date}. Si prega di regolarizzare il pagamento.',
        back: 'Indietro',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Suscripción',
        errorTitle: 'No se pudo cargar',
        errorMessage: 'No se pudieron cargar los datos de la suscripción. Inténtalo de nuevo.',
        retryButton: 'Reintentar',
        planLabel: 'Plan',
        planFree: 'Gratis',
        planPaid: 'De pago',
        membersLabel: 'Miembros',
        monthlyPriceLabel: 'Precio mensual',
        vatNote: 'sin IVA',
        deadlineLabel: 'Fin del periodo gratuito',
        noDeadline: 'Ninguno (gratis sin límite)',
        statusPaid: 'Plan de pago activo.',
        statusFreeNoDeadline: 'Periodo gratuito sin fecha límite. Nada que pagar por ahora.',
        statusFreeActive: 'Gratis hasta el {date}. Después se aplicará la suscripción mensual.',
        statusFreeExpired: 'El periodo gratuito terminó el {date}. Por favor, regulariza el pago.',
        back: 'Volver',
      };
    default:
      return {
        pageTitle: 'Subscription',
        errorTitle: 'Couldn’t load',
        errorMessage: 'The subscription details couldn’t be loaded. Please try again.',
        retryButton: 'Retry',
        planLabel: 'Plan',
        planFree: 'Free',
        planPaid: 'Paid',
        membersLabel: 'Members',
        monthlyPriceLabel: 'Monthly price',
        vatNote: 'excl. VAT',
        deadlineLabel: 'Free period deadline',
        noDeadline: 'None (free, no limit)',
        statusPaid: 'Paid plan active.',
        statusFreeNoDeadline: 'Free period with no deadline. Nothing to pay for now.',
        statusFreeActive: 'Free until {date}. After that, the monthly subscription applies.',
        statusFreeExpired: 'The free period ended on {date}. Please arrange payment.',
        back: 'Back',
      };
  }
}
