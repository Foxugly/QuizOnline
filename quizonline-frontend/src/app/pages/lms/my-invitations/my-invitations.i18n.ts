import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-page dictionary for ``/lms/me/invitations`` — the learner-side
 * "My invitations" hub that lists every pending invitation the
 * current user has received, with a deep-link to each acceptance
 * page.
 */
export interface LmsMyInvitationsUiText {
  pageTitle: string;
  loading: string;
  invitationFrom: (inviter: string) => string;
  expiresAt: (when: string) => string;
  viewInvitationButton: string;
  emptyTitle: string;
  emptyMessage: string;
  loadErrorToast: string;
}

export function getLmsMyInvitationsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsMyInvitationsUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Mes invitations',
        loading: 'Chargement…',
        invitationFrom: (inviter) => `Invité·e par ${inviter}`,
        expiresAt: (when) => `Expire le ${when}`,
        viewInvitationButton: 'Voir l’invitation',
        emptyTitle: 'Aucune invitation en cours',
        emptyMessage:
          'Vous n’avez aucune invitation à un cours en attente d’acceptation.',
        loadErrorToast: 'Impossible de charger les invitations.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Mijn uitnodigingen',
        loading: 'Laden…',
        invitationFrom: (inviter) => `Uitgenodigd door ${inviter}`,
        expiresAt: (when) => `Vervalt op ${when}`,
        viewInvitationButton: 'Uitnodiging bekijken',
        emptyTitle: 'Geen lopende uitnodigingen',
        emptyMessage:
          'Je hebt geen lopende cursusuitnodigingen om te accepteren.',
        loadErrorToast: 'Uitnodigingen konden niet worden geladen.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'I miei inviti',
        loading: 'Caricamento…',
        invitationFrom: (inviter) => `Invitato da ${inviter}`,
        expiresAt: (when) => `Scade il ${when}`,
        viewInvitationButton: 'Vedi l’invito',
        emptyTitle: 'Nessun invito in corso',
        emptyMessage: 'Non hai inviti a corsi in attesa di accettazione.',
        loadErrorToast: 'Impossibile caricare gli inviti.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Mis invitaciones',
        loading: 'Cargando…',
        invitationFrom: (inviter) => `Invitado por ${inviter}`,
        expiresAt: (when) => `Caduca el ${when}`,
        viewInvitationButton: 'Ver la invitación',
        emptyTitle: 'No hay invitaciones en curso',
        emptyMessage:
          'No tienes invitaciones a cursos pendientes de aceptación.',
        loadErrorToast: 'No se pudieron cargar las invitaciones.',
      };
    default:
      return {
        pageTitle: 'My invitations',
        loading: 'Loading…',
        invitationFrom: (inviter) => `Invited by ${inviter}`,
        expiresAt: (when) => `Expires on ${when}`,
        viewInvitationButton: 'View the invitation',
        emptyTitle: 'No outstanding invitations',
        emptyMessage:
          'You have no pending course invitations waiting for your response.',
        loadErrorToast: 'Failed to load invitations.',
      };
  }
}
