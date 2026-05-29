import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Per-page dictionary for ``/me/invitations`` — the learner-side
 * "My invitations" hub that lists every pending invitation the
 * current user has received, with a deep-link to each acceptance
 * page.
 */
export interface MyInvitationsUiText {
  pageTitle: string;
  loading: string;
  invitationFrom: (inviter: string) => string;
  expiresAt: (when: string) => string;
  viewInvitationButton: string;
  viewCourseButton: string;
  emptyTitle: string;
  emptyMessage: string;
  loadErrorToast: string;
  tabPending: string;
  tabHistory: string;
  emptyHistoryTitle: string;
  emptyHistoryMessage: string;
  statusLabels: Record<'pending' | 'accepted' | 'declined' | 'revoked' | 'expired', string>;
  historyDateLabel: (when: string) => string;
}

export function getMyInvitationsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): MyInvitationsUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Mes invitations',
        loading: 'Chargement…',
        invitationFrom: (inviter) => `Invité·e par ${inviter}`,
        expiresAt: (when) => `Expire le ${when}`,
        viewInvitationButton: 'Voir l’invitation',
        viewCourseButton: 'Aller au cours',
        emptyTitle: 'Aucune invitation en cours',
        emptyMessage:
          'Vous n’avez aucune invitation à un cours en attente d’acceptation.',
        loadErrorToast: 'Impossible de charger les invitations.',
        tabPending: 'En cours',
        tabHistory: 'Historique',
        emptyHistoryTitle: 'Aucune invitation passée',
        emptyHistoryMessage: 'Vos invitations acceptées, refusées, expirées ou révoquées s’afficheront ici.',
        statusLabels: {
          pending: 'En attente',
          accepted: 'Acceptée',
          declined: 'Refusée',
          revoked: 'Révoquée',
          expired: 'Expirée',
        },
        historyDateLabel: (when) => `Le ${when}`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Mijn uitnodigingen',
        loading: 'Laden…',
        invitationFrom: (inviter) => `Uitgenodigd door ${inviter}`,
        expiresAt: (when) => `Vervalt op ${when}`,
        viewInvitationButton: 'Uitnodiging bekijken',
        viewCourseButton: 'Ga naar de cursus',
        emptyTitle: 'Geen lopende uitnodigingen',
        emptyMessage:
          'Je hebt geen lopende cursusuitnodigingen om te accepteren.',
        loadErrorToast: 'Uitnodigingen konden niet worden geladen.',
        tabPending: 'Lopend',
        tabHistory: 'Geschiedenis',
        emptyHistoryTitle: 'Geen eerdere uitnodigingen',
        emptyHistoryMessage: 'Geaccepteerde, geweigerde, verlopen of ingetrokken uitnodigingen verschijnen hier.',
        statusLabels: {
          pending: 'In behandeling',
          accepted: 'Geaccepteerd',
          declined: 'Geweigerd',
          revoked: 'Ingetrokken',
          expired: 'Verlopen',
        },
        historyDateLabel: (when) => `Op ${when}`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'I miei inviti',
        loading: 'Caricamento…',
        invitationFrom: (inviter) => `Invitato da ${inviter}`,
        expiresAt: (when) => `Scade il ${when}`,
        viewInvitationButton: 'Vedi l’invito',
        viewCourseButton: 'Vai al corso',
        emptyTitle: 'Nessun invito in corso',
        emptyMessage: 'Non hai inviti a corsi in attesa di accettazione.',
        loadErrorToast: 'Impossibile caricare gli inviti.',
        tabPending: 'In corso',
        tabHistory: 'Cronologia',
        emptyHistoryTitle: 'Nessun invito precedente',
        emptyHistoryMessage: 'Inviti accettati, rifiutati, scaduti o revocati appariranno qui.',
        statusLabels: {
          pending: 'In attesa',
          accepted: 'Accettato',
          declined: 'Rifiutato',
          revoked: 'Revocato',
          expired: 'Scaduto',
        },
        historyDateLabel: (when) => `Il ${when}`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Mis invitaciones',
        loading: 'Cargando…',
        invitationFrom: (inviter) => `Invitado por ${inviter}`,
        expiresAt: (when) => `Caduca el ${when}`,
        viewInvitationButton: 'Ver la invitación',
        viewCourseButton: 'Ir al curso',
        emptyTitle: 'No hay invitaciones en curso',
        emptyMessage:
          'No tienes invitaciones a cursos pendientes de aceptación.',
        loadErrorToast: 'No se pudieron cargar las invitaciones.',
        tabPending: 'En curso',
        tabHistory: 'Historial',
        emptyHistoryTitle: 'Sin invitaciones anteriores',
        emptyHistoryMessage: 'Las invitaciones aceptadas, rechazadas, caducadas o revocadas aparecerán aquí.',
        statusLabels: {
          pending: 'Pendiente',
          accepted: 'Aceptada',
          declined: 'Rechazada',
          revoked: 'Revocada',
          expired: 'Caducada',
        },
        historyDateLabel: (when) => `El ${when}`,
      };
    default:
      return {
        pageTitle: 'My invitations',
        loading: 'Loading…',
        invitationFrom: (inviter) => `Invited by ${inviter}`,
        expiresAt: (when) => `Expires on ${when}`,
        viewInvitationButton: 'View the invitation',
        viewCourseButton: 'Go to the course',
        emptyTitle: 'No outstanding invitations',
        emptyMessage:
          'You have no pending course invitations waiting for your response.',
        loadErrorToast: 'Failed to load invitations.',
        tabPending: 'Pending',
        tabHistory: 'History',
        emptyHistoryTitle: 'No past invitations',
        emptyHistoryMessage: 'Accepted, declined, expired or revoked invitations will appear here.',
        statusLabels: {
          pending: 'Pending',
          accepted: 'Accepted',
          declined: 'Declined',
          revoked: 'Revoked',
          expired: 'Expired',
        },
        historyDateLabel: (when) => `On ${when}`,
      };
  }
}
