import {LanguageEnumDto} from '../../api/generated/model/language-enum';

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
    requesterLine: (username: string, email: string) => string;
    domainLine: (domain: string) => string;
    actionLineApprove: string;
    actionLineReject: string;
    statusLine: (status: string) => string;
    decidedBy: (username: string, when: string) => string;
    requestedAt: (when: string) => string;
    rejectReason: (reason: string) => string;
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

const FR: JoinRequestDecideUiText = {
  title: 'Modération d\'une demande d\'accès',
  loading: 'Chargement du lien…',
  errors: {
    tokenInvalid: 'Lien invalide. Il a peut-être été altéré ou copié partiellement.',
    tokenExpired: 'Lien expiré. Connectez-vous à l\'application pour modérer cette demande.',
    recipientMismatch: 'Ce lien n\'est pas destiné à votre compte. Connectez-vous avec le compte qui a reçu le mail.',
    cannotApproveAnymore: 'Vous n\'avez plus les droits de modération sur ce domaine.',
    requestNotFound: 'Cette demande n\'existe plus.',
    generic: 'Une erreur est survenue. Réessayez plus tard.',
  },
  recap: {
    requesterLine: (username, email) => `Demandeur : ${username}${email ? ` (${email})` : ''}`,
    domainLine: (domain) => `Domaine : ${domain}`,
    actionLineApprove: 'Action : approuver l\'accès.',
    actionLineReject: 'Action : refuser l\'accès.',
    statusLine: (status) => `Statut actuel : ${status}`,
    decidedBy: (username, when) => `Décidé par ${username} le ${when}.`,
    requestedAt: (when) => `Demande reçue le ${when}.`,
    rejectReason: (reason) => `Motif précédent : ${reason}`,
  },
  override: {
    bannerTitle: 'Cette demande a déjà été tranchée.',
    bannerExplain: 'Si vous confirmez, votre décision écrasera la précédente (last-decision-wins).',
  },
  status: {
    pending: 'en attente',
    approved: 'approuvée',
    rejected: 'refusée',
    cancelled: 'annulée',
  },
  buttons: {
    confirmApprove: 'Confirmer l\'approbation',
    confirmReject: 'Confirmer le refus',
    overrideApprove: 'Approuver malgré tout',
    overrideReject: 'Refuser malgré tout',
    backHome: 'Retour à l\'accueil',
    submitting: 'Envoi…',
  },
  done: {
    approved: 'Demande approuvée. Le demandeur a été notifié.',
    rejected: 'Demande refusée. Le demandeur a été notifié.',
  },
};

const EN: JoinRequestDecideUiText = {
  title: 'Moderate a join request',
  loading: 'Loading link…',
  errors: {
    tokenInvalid: 'Invalid link. It may have been altered or copied incompletely.',
    tokenExpired: 'Expired link. Sign in to the app to moderate this request.',
    recipientMismatch: 'This link is not meant for your account. Sign in with the account that received the email.',
    cannotApproveAnymore: 'You no longer have moderation rights on this domain.',
    requestNotFound: 'This request no longer exists.',
    generic: 'Something went wrong. Try again later.',
  },
  recap: {
    requesterLine: (username, email) => `Requester: ${username}${email ? ` (${email})` : ''}`,
    domainLine: (domain) => `Domain: ${domain}`,
    actionLineApprove: 'Action: approve access.',
    actionLineReject: 'Action: reject access.',
    statusLine: (status) => `Current status: ${status}`,
    decidedBy: (username, when) => `Decided by ${username} on ${when}.`,
    requestedAt: (when) => `Request received on ${when}.`,
    rejectReason: (reason) => `Previous reason: ${reason}`,
  },
  override: {
    bannerTitle: 'This request has already been decided.',
    bannerExplain: 'If you confirm, your decision will override the previous one (last-decision-wins).',
  },
  status: {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    cancelled: 'cancelled',
  },
  buttons: {
    confirmApprove: 'Confirm approval',
    confirmReject: 'Confirm rejection',
    overrideApprove: 'Approve anyway',
    overrideReject: 'Reject anyway',
    backHome: 'Back to home',
    submitting: 'Submitting…',
  },
  done: {
    approved: 'Request approved. The requester has been notified.',
    rejected: 'Request rejected. The requester has been notified.',
  },
};

const NL: JoinRequestDecideUiText = {
  title: 'Een toegangsaanvraag modereren',
  loading: 'Link laden…',
  errors: {
    tokenInvalid: 'Ongeldige link. Hij kan zijn aangepast of onvolledig gekopieerd.',
    tokenExpired: 'Verlopen link. Log in op de app om deze aanvraag te modereren.',
    recipientMismatch: 'Deze link is niet voor uw account bedoeld. Log in met het account dat de mail heeft ontvangen.',
    cannotApproveAnymore: 'U hebt geen moderatierechten meer op dit domein.',
    requestNotFound: 'Deze aanvraag bestaat niet meer.',
    generic: 'Er is iets misgegaan. Probeer het later opnieuw.',
  },
  recap: {
    requesterLine: (username, email) => `Aanvrager: ${username}${email ? ` (${email})` : ''}`,
    domainLine: (domain) => `Domein: ${domain}`,
    actionLineApprove: 'Actie: toegang goedkeuren.',
    actionLineReject: 'Actie: toegang afwijzen.',
    statusLine: (status) => `Huidige status: ${status}`,
    decidedBy: (username, when) => `Beslist door ${username} op ${when}.`,
    requestedAt: (when) => `Aanvraag ontvangen op ${when}.`,
    rejectReason: (reason) => `Vorige reden: ${reason}`,
  },
  override: {
    bannerTitle: 'Over deze aanvraag is al beslist.',
    bannerExplain: 'Als u bevestigt, vervangt uw beslissing de vorige (last-decision-wins).',
  },
  status: {
    pending: 'in afwachting',
    approved: 'goedgekeurd',
    rejected: 'afgewezen',
    cancelled: 'geannuleerd',
  },
  buttons: {
    confirmApprove: 'Goedkeuring bevestigen',
    confirmReject: 'Afwijzing bevestigen',
    overrideApprove: 'Toch goedkeuren',
    overrideReject: 'Toch afwijzen',
    backHome: 'Terug naar home',
    submitting: 'Versturen…',
  },
  done: {
    approved: 'Aanvraag goedgekeurd. De aanvrager is op de hoogte gebracht.',
    rejected: 'Aanvraag afgewezen. De aanvrager is op de hoogte gebracht.',
  },
};

const IT: JoinRequestDecideUiText = {
  title: 'Moderazione di una richiesta di accesso',
  loading: 'Caricamento del link…',
  errors: {
    tokenInvalid: 'Link non valido. Potrebbe essere stato alterato o copiato in modo incompleto.',
    tokenExpired: 'Link scaduto. Accedi all\'app per moderare questa richiesta.',
    recipientMismatch: 'Questo link non è destinato al tuo account. Accedi con l\'account che ha ricevuto l\'e-mail.',
    cannotApproveAnymore: 'Non hai più diritti di moderazione su questo dominio.',
    requestNotFound: 'Questa richiesta non esiste più.',
    generic: 'Qualcosa è andato storto. Riprova più tardi.',
  },
  recap: {
    requesterLine: (username, email) => `Richiedente: ${username}${email ? ` (${email})` : ''}`,
    domainLine: (domain) => `Dominio: ${domain}`,
    actionLineApprove: 'Azione: approvare l\'accesso.',
    actionLineReject: 'Azione: rifiutare l\'accesso.',
    statusLine: (status) => `Stato attuale: ${status}`,
    decidedBy: (username, when) => `Deciso da ${username} il ${when}.`,
    requestedAt: (when) => `Richiesta ricevuta il ${when}.`,
    rejectReason: (reason) => `Motivo precedente: ${reason}`,
  },
  override: {
    bannerTitle: 'Questa richiesta è già stata decisa.',
    bannerExplain: 'Se confermi, la tua decisione sovrascriverà quella precedente (last-decision-wins).',
  },
  status: {
    pending: 'in attesa',
    approved: 'approvata',
    rejected: 'rifiutata',
    cancelled: 'annullata',
  },
  buttons: {
    confirmApprove: 'Conferma approvazione',
    confirmReject: 'Conferma rifiuto',
    overrideApprove: 'Approva comunque',
    overrideReject: 'Rifiuta comunque',
    backHome: 'Torna alla home',
    submitting: 'Invio in corso…',
  },
  done: {
    approved: 'Richiesta approvata. Il richiedente è stato informato.',
    rejected: 'Richiesta rifiutata. Il richiedente è stato informato.',
  },
};

const ES: JoinRequestDecideUiText = {
  title: 'Moderar una solicitud de acceso',
  loading: 'Cargando el enlace…',
  errors: {
    tokenInvalid: 'Enlace no válido. Es posible que se haya alterado o copiado incompleto.',
    tokenExpired: 'Enlace caducado. Inicia sesión en la app para moderar esta solicitud.',
    recipientMismatch: 'Este enlace no está destinado a tu cuenta. Inicia sesión con la cuenta que recibió el correo.',
    cannotApproveAnymore: 'Ya no tienes derechos de moderación sobre este dominio.',
    requestNotFound: 'Esta solicitud ya no existe.',
    generic: 'Algo salió mal. Inténtalo de nuevo más tarde.',
  },
  recap: {
    requesterLine: (username, email) => `Solicitante: ${username}${email ? ` (${email})` : ''}`,
    domainLine: (domain) => `Dominio: ${domain}`,
    actionLineApprove: 'Acción: aprobar el acceso.',
    actionLineReject: 'Acción: rechazar el acceso.',
    statusLine: (status) => `Estado actual: ${status}`,
    decidedBy: (username, when) => `Decidido por ${username} el ${when}.`,
    requestedAt: (when) => `Solicitud recibida el ${when}.`,
    rejectReason: (reason) => `Motivo anterior: ${reason}`,
  },
  override: {
    bannerTitle: 'Esta solicitud ya se ha decidido.',
    bannerExplain: 'Si confirmas, tu decisión sustituirá a la anterior (last-decision-wins).',
  },
  status: {
    pending: 'pendiente',
    approved: 'aprobada',
    rejected: 'rechazada',
    cancelled: 'cancelada',
  },
  buttons: {
    confirmApprove: 'Confirmar aprobación',
    confirmReject: 'Confirmar rechazo',
    overrideApprove: 'Aprobar de todos modos',
    overrideReject: 'Rechazar de todos modos',
    backHome: 'Volver al inicio',
    submitting: 'Enviando…',
  },
  done: {
    approved: 'Solicitud aprobada. Se ha notificado al solicitante.',
    rejected: 'Solicitud rechazada. Se ha notificado al solicitante.',
  },
};

const DICT: Record<LanguageEnumDto, JoinRequestDecideUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getJoinRequestDecideUiText(
  lang: LanguageEnumDto | string | null | undefined,
): JoinRequestDecideUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
