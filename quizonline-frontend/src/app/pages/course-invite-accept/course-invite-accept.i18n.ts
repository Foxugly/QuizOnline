import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Per-page dictionary for the invitee-side acceptance page at
 * ``/course-invite/:token``. Surfaces the labels needed to render
 * "X has invited you to Y" plus the Accept / Decline CTAs and the
 * outcome / error messages.
 */
export interface CourseInviteAcceptUiText {
  pageTitle: string;
  loadingMessage: string;
  invitationFrom: (inviter: string, course: string) => string;
  expiresAt: (when: string) => string;
  durationLabel: (minutes: number) => string;
  levelLabel: string;
  learningObjectivesHeading: string;
  levelChoices: Record<'beginner' | 'intermediate' | 'advanced', string>;
  acceptButton: string;
  declineButton: string;
  declineConfirmHeader: string;
  declineConfirmMessage: (courseTitle: string) => string;
  declineConfirmAccept: string;
  declineConfirmReject: string;
  backToCatalogButton: string;
  goToCourseButton: string;

  acceptedTitle: string;
  acceptedMessage: string;
  acceptedRedirectHint: string;
  declinedTitle: string;
  declinedMessage: string;
  revokedTitle: string;
  revokedMessage: string;
  expiredTitle: string;
  expiredMessage: string;
  notFoundTitle: string;
  notFoundMessage: string;
  forbiddenTitle: string;
  forbiddenMessage: string;

  acceptSuccessToast: string;
  acceptErrorToast: string;
  declineSuccessToast: string;
  declineErrorToast: string;
}

export function getCourseInviteAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseInviteAcceptUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Invitation à un cours',
        loadingMessage: 'Chargement de l’invitation…',
        invitationFrom: (inviter, course) =>
          `${inviter} vous invite à rejoindre le cours « ${course} ».`,
        expiresAt: (when) => `Cette invitation expire le ${when}.`,
        durationLabel: (minutes) => `${minutes} min`,
        levelLabel: 'Niveau',
        learningObjectivesHeading: 'Objectifs d’apprentissage',
        levelChoices: {beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'},
        acceptButton: 'Accepter l’invitation',
        declineButton: 'Refuser',
        declineConfirmHeader: 'Refuser l’invitation',
        declineConfirmMessage: (courseTitle) =>
          `Refuser définitivement l’invitation à « ${courseTitle} » ? L’instructeur devra vous renvoyer une invitation si vous changez d’avis.`,
        declineConfirmAccept: 'Refuser',
        declineConfirmReject: 'Annuler',
        backToCatalogButton: 'Retour au catalogue',
        goToCourseButton: 'Aller au cours',
        acceptedTitle: 'Invitation acceptée',
        acceptedMessage: 'Vous êtes maintenant inscrit·e au cours.',
        acceptedRedirectHint: 'Redirection vers le cours dans 2 secondes…',
        declinedTitle: 'Invitation refusée',
        declinedMessage: 'L’invitation a été marquée comme refusée.',
        revokedTitle: 'Invitation révoquée',
        revokedMessage: 'Cette invitation a été révoquée par l’instructeur.',
        expiredTitle: 'Invitation expirée',
        expiredMessage:
          'Le délai pour accepter cette invitation est écoulé. Contactez l’instructeur pour en recevoir une nouvelle.',
        notFoundTitle: 'Invitation introuvable',
        notFoundMessage: 'Le lien d’invitation n’est pas valide ou a déjà été utilisé.',
        forbiddenTitle: 'Accès refusé',
        forbiddenMessage:
          'Cette invitation ne vous est pas destinée. Connectez-vous avec le compte correspondant à l’adresse invitée.',
        acceptSuccessToast: 'Invitation acceptée.',
        acceptErrorToast: 'Impossible d’accepter l’invitation.',
        declineSuccessToast: 'Invitation refusée.',
        declineErrorToast: 'Impossible de refuser l’invitation.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Uitnodiging voor een cursus',
        loadingMessage: 'Uitnodiging laden…',
        invitationFrom: (inviter, course) =>
          `${inviter} nodigt je uit voor de cursus "${course}".`,
        expiresAt: (when) => `Deze uitnodiging vervalt op ${when}.`,
        durationLabel: (minutes) => `${minutes} min`,
        levelLabel: 'Niveau',
        learningObjectivesHeading: 'Leerdoelen',
        levelChoices: {beginner: 'Beginner', intermediate: 'Gemiddeld', advanced: 'Gevorderd'},
        acceptButton: 'Uitnodiging accepteren',
        declineButton: 'Weigeren',
        declineConfirmHeader: 'Uitnodiging weigeren',
        declineConfirmMessage: (courseTitle) =>
          `De uitnodiging voor "${courseTitle}" definitief weigeren? De instructeur moet een nieuwe uitnodiging sturen als je van gedachten verandert.`,
        declineConfirmAccept: 'Weigeren',
        declineConfirmReject: 'Annuleren',
        backToCatalogButton: 'Terug naar catalogus',
        goToCourseButton: 'Ga naar de cursus',
        acceptedTitle: 'Uitnodiging geaccepteerd',
        acceptedMessage: 'Je bent nu ingeschreven voor de cursus.',
        acceptedRedirectHint: 'Doorsturen naar de cursus over 2 seconden…',
        declinedTitle: 'Uitnodiging geweigerd',
        declinedMessage: 'De uitnodiging is gemarkeerd als geweigerd.',
        revokedTitle: 'Uitnodiging ingetrokken',
        revokedMessage: 'Deze uitnodiging is ingetrokken door de instructeur.',
        expiredTitle: 'Uitnodiging verlopen',
        expiredMessage:
          'De termijn om deze uitnodiging te accepteren is verstreken. Neem contact op met de instructeur voor een nieuwe.',
        notFoundTitle: 'Uitnodiging niet gevonden',
        notFoundMessage: 'De uitnodigingslink is niet geldig of is al gebruikt.',
        forbiddenTitle: 'Toegang geweigerd',
        forbiddenMessage:
          'Deze uitnodiging is niet voor jou bestemd. Log in met het account dat overeenkomt met het uitgenodigde adres.',
        acceptSuccessToast: 'Uitnodiging geaccepteerd.',
        acceptErrorToast: 'Uitnodiging accepteren is mislukt.',
        declineSuccessToast: 'Uitnodiging geweigerd.',
        declineErrorToast: 'Uitnodiging weigeren is mislukt.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Invito a un corso',
        loadingMessage: 'Caricamento dell’invito…',
        invitationFrom: (inviter, course) =>
          `${inviter} ti invita a partecipare al corso "${course}".`,
        expiresAt: (when) => `Questo invito scade il ${when}.`,
        durationLabel: (minutes) => `${minutes} min`,
        levelLabel: 'Livello',
        learningObjectivesHeading: 'Obiettivi di apprendimento',
        levelChoices: {beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'},
        acceptButton: 'Accetta l’invito',
        declineButton: 'Rifiuta',
        declineConfirmHeader: 'Rifiutare l’invito',
        declineConfirmMessage: (courseTitle) =>
          `Rifiutare definitivamente l’invito a "${courseTitle}"? L’istruttore dovrà inviare un nuovo invito se cambi idea.`,
        declineConfirmAccept: 'Rifiuta',
        declineConfirmReject: 'Annulla',
        backToCatalogButton: 'Torna al catalogo',
        goToCourseButton: 'Vai al corso',
        acceptedTitle: 'Invito accettato',
        acceptedMessage: 'Ora sei iscritto al corso.',
        acceptedRedirectHint: 'Reindirizzamento al corso tra 2 secondi…',
        declinedTitle: 'Invito rifiutato',
        declinedMessage: 'L’invito è stato contrassegnato come rifiutato.',
        revokedTitle: 'Invito revocato',
        revokedMessage: 'Questo invito è stato revocato dall’istruttore.',
        expiredTitle: 'Invito scaduto',
        expiredMessage:
          'Il termine per accettare questo invito è scaduto. Contatta l’istruttore per riceverne uno nuovo.',
        notFoundTitle: 'Invito non trovato',
        notFoundMessage: 'Il link dell’invito non è valido o è già stato utilizzato.',
        forbiddenTitle: 'Accesso negato',
        forbiddenMessage:
          'Questo invito non è destinato a te. Accedi con l’account corrispondente all’indirizzo invitato.',
        acceptSuccessToast: 'Invito accettato.',
        acceptErrorToast: 'Impossibile accettare l’invito.',
        declineSuccessToast: 'Invito rifiutato.',
        declineErrorToast: 'Impossibile rifiutare l’invito.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Invitación a un curso',
        loadingMessage: 'Cargando la invitación…',
        invitationFrom: (inviter, course) =>
          `${inviter} te invita a unirte al curso «${course}».`,
        expiresAt: (when) => `Esta invitación caduca el ${when}.`,
        durationLabel: (minutes) => `${minutes} min`,
        levelLabel: 'Nivel',
        learningObjectivesHeading: 'Objetivos de aprendizaje',
        levelChoices: {beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado'},
        acceptButton: 'Aceptar la invitación',
        declineButton: 'Rechazar',
        declineConfirmHeader: 'Rechazar la invitación',
        declineConfirmMessage: (courseTitle) =>
          `¿Rechazar definitivamente la invitación a «${courseTitle}»? El instructor deberá enviarte una nueva invitación si cambias de opinión.`,
        declineConfirmAccept: 'Rechazar',
        declineConfirmReject: 'Cancelar',
        backToCatalogButton: 'Volver al catálogo',
        goToCourseButton: 'Ir al curso',
        acceptedTitle: 'Invitación aceptada',
        acceptedMessage: 'Ya estás inscrito en el curso.',
        acceptedRedirectHint: 'Redirigiendo al curso en 2 segundos…',
        declinedTitle: 'Invitación rechazada',
        declinedMessage: 'La invitación se ha marcado como rechazada.',
        revokedTitle: 'Invitación revocada',
        revokedMessage: 'Esta invitación ha sido revocada por el instructor.',
        expiredTitle: 'Invitación caducada',
        expiredMessage:
          'El plazo para aceptar esta invitación ha vencido. Contacta con el instructor para recibir una nueva.',
        notFoundTitle: 'Invitación no encontrada',
        notFoundMessage: 'El enlace de invitación no es válido o ya se ha utilizado.',
        forbiddenTitle: 'Acceso denegado',
        forbiddenMessage:
          'Esta invitación no es para ti. Inicia sesión con la cuenta correspondiente a la dirección invitada.',
        acceptSuccessToast: 'Invitación aceptada.',
        acceptErrorToast: 'No se pudo aceptar la invitación.',
        declineSuccessToast: 'Invitación rechazada.',
        declineErrorToast: 'No se pudo rechazar la invitación.',
      };
    default:
      return {
        pageTitle: 'Course invitation',
        loadingMessage: 'Loading the invitation…',
        invitationFrom: (inviter, course) =>
          `${inviter} has invited you to join the course "${course}".`,
        expiresAt: (when) => `This invitation expires on ${when}.`,
        durationLabel: (minutes) => `${minutes} min`,
        levelLabel: 'Level',
        learningObjectivesHeading: 'Learning objectives',
        levelChoices: {beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced'},
        acceptButton: 'Accept the invitation',
        declineButton: 'Decline',
        declineConfirmHeader: 'Decline the invitation',
        declineConfirmMessage: (courseTitle) =>
          `Permanently decline the invitation to "${courseTitle}"? The instructor will have to send you a new invitation if you change your mind.`,
        declineConfirmAccept: 'Decline',
        declineConfirmReject: 'Cancel',
        backToCatalogButton: 'Back to catalog',
        goToCourseButton: 'Go to the course',
        acceptedTitle: 'Invitation accepted',
        acceptedMessage: 'You are now enrolled in the course.',
        acceptedRedirectHint: 'Redirecting to the course in 2 seconds…',
        declinedTitle: 'Invitation declined',
        declinedMessage: 'The invitation has been marked as declined.',
        revokedTitle: 'Invitation revoked',
        revokedMessage: 'This invitation has been revoked by the instructor.',
        expiredTitle: 'Invitation expired',
        expiredMessage:
          'The deadline to accept this invitation has passed. Contact the instructor to receive a new one.',
        notFoundTitle: 'Invitation not found',
        notFoundMessage: 'The invitation link is not valid or has already been used.',
        forbiddenTitle: 'Access denied',
        forbiddenMessage:
          'This invitation is not for you. Sign in with the account matching the invited address.',
        acceptSuccessToast: 'Invitation accepted.',
        acceptErrorToast: 'Could not accept the invitation.',
        declineSuccessToast: 'Invitation declined.',
        declineErrorToast: 'Could not decline the invitation.',
      };
  }
}
