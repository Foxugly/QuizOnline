import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCourseDetailUiText {
  pageTitle: string;
  loading: string;
  sectionsHeading: string;
  learningObjectivesHeading: string;
  durationLabel: string;
  enrollButton: string;
  acceptInviteButton: string;
  continueButton: string;
  editButton: string;
  enrolledBadge: string;
  pendingBadge: string;
  startLessonButton: string;
  completedLessonBadge: string;
  previewBadge: string;
  inviteOnlyMessage: string;
  approvalPendingMessage: string;
  invitedByBanner: (inviter: string) => string;
  enrollSuccessToast: string;
  enrollErrorToast: string;
  acceptInviteSuccessToast: string;
  acceptInviteErrorToast: string;
  emptyContentTitle: string;
  emptyContentMessage: string;
}

export function getLmsCourseDetailUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseDetailUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Cours',
        loading: 'Chargement…',
        sectionsHeading: 'Contenu du cours',
        learningObjectivesHeading: "Objectifs d'apprentissage",
        durationLabel: '{n} min',
        enrollButton: "M'inscrire",
        acceptInviteButton: "Accepter l'invitation",
        continueButton: 'Reprendre',
        editButton: 'Modifier',
        enrolledBadge: 'Inscrit',
        pendingBadge: 'En attente',
        startLessonButton: 'Commencer',
        completedLessonBadge: 'Terminé',
        previewBadge: 'Aperçu',
        inviteOnlyMessage: 'Ce cours est sur invitation uniquement.',
        approvalPendingMessage: 'Votre inscription attend la validation d\'un instructeur.',
        invitedByBanner: (inviter) => `${inviter} vous a invité·e à rejoindre ce cours.`,
        enrollSuccessToast: 'Inscription confirmée.',
        enrollErrorToast: "Impossible de s'inscrire.",
        acceptInviteSuccessToast: 'Invitation acceptée.',
        acceptInviteErrorToast: "Impossible d'accepter l'invitation.",
        emptyContentTitle: 'Aucun contenu pour l\'instant',
        emptyContentMessage: 'Le contenu du cours n\'a pas encore été publié.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus',
        loading: 'Laden…',
        sectionsHeading: 'Cursusinhoud',
        learningObjectivesHeading: 'Leerdoelen',
        durationLabel: '{n} min',
        enrollButton: 'Inschrijven',
        acceptInviteButton: 'Uitnodiging accepteren',
        continueButton: 'Hervatten',
        editButton: 'Bewerken',
        enrolledBadge: 'Ingeschreven',
        pendingBadge: 'In afwachting',
        startLessonButton: 'Beginnen',
        completedLessonBadge: 'Voltooid',
        previewBadge: 'Voorbeeld',
        inviteOnlyMessage: 'Deze cursus is alleen op uitnodiging.',
        approvalPendingMessage: 'Je inschrijving wacht op goedkeuring van een instructeur.',
        invitedByBanner: (inviter) => `${inviter} heeft je uitgenodigd voor deze cursus.`,
        enrollSuccessToast: 'Inschrijving bevestigd.',
        enrollErrorToast: 'Inschrijven mislukt.',
        acceptInviteSuccessToast: 'Uitnodiging geaccepteerd.',
        acceptInviteErrorToast: 'Uitnodiging accepteren is mislukt.',
        emptyContentTitle: 'Nog geen inhoud',
        emptyContentMessage: 'De cursusinhoud is nog niet gepubliceerd.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Corso',
        loading: 'Caricamento…',
        sectionsHeading: 'Contenuto del corso',
        learningObjectivesHeading: 'Obiettivi di apprendimento',
        durationLabel: '{n} min',
        enrollButton: 'Iscriviti',
        acceptInviteButton: "Accetta l'invito",
        continueButton: 'Riprendi',
        editButton: 'Modifica',
        enrolledBadge: 'Iscritto',
        pendingBadge: 'In attesa',
        startLessonButton: 'Inizia',
        completedLessonBadge: 'Completato',
        previewBadge: 'Anteprima',
        inviteOnlyMessage: 'Questo corso è solo su invito.',
        approvalPendingMessage: 'La tua iscrizione attende l\'approvazione di un istruttore.',
        invitedByBanner: (inviter) => `${inviter} ti ha invitato a partecipare a questo corso.`,
        enrollSuccessToast: 'Iscrizione confermata.',
        enrollErrorToast: 'Iscrizione non riuscita.',
        acceptInviteSuccessToast: 'Invito accettato.',
        acceptInviteErrorToast: "Impossibile accettare l'invito.",
        emptyContentTitle: 'Nessun contenuto ancora',
        emptyContentMessage: 'Il contenuto del corso non è ancora stato pubblicato.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Curso',
        loading: 'Cargando…',
        sectionsHeading: 'Contenido del curso',
        learningObjectivesHeading: 'Objetivos de aprendizaje',
        durationLabel: '{n} min',
        enrollButton: 'Inscribirme',
        acceptInviteButton: 'Aceptar la invitación',
        continueButton: 'Reanudar',
        editButton: 'Editar',
        enrolledBadge: 'Inscrito',
        pendingBadge: 'Pendiente',
        startLessonButton: 'Comenzar',
        completedLessonBadge: 'Completado',
        previewBadge: 'Vista previa',
        inviteOnlyMessage: 'Este curso es solo por invitación.',
        approvalPendingMessage: 'Tu inscripción está pendiente de aprobación.',
        invitedByBanner: (inviter) => `${inviter} te ha invitado a este curso.`,
        enrollSuccessToast: 'Inscripción confirmada.',
        enrollErrorToast: 'No se pudo inscribir.',
        acceptInviteSuccessToast: 'Invitación aceptada.',
        acceptInviteErrorToast: 'No se pudo aceptar la invitación.',
        emptyContentTitle: 'Sin contenido aún',
        emptyContentMessage: 'El contenido del curso aún no ha sido publicado.',
      };
    default:
      return {
        pageTitle: 'Course',
        loading: 'Loading…',
        sectionsHeading: 'Course content',
        learningObjectivesHeading: 'Learning objectives',
        durationLabel: '{n} min',
        enrollButton: 'Enroll',
        acceptInviteButton: 'Accept the invitation',
        continueButton: 'Continue',
        editButton: 'Edit',
        enrolledBadge: 'Enrolled',
        pendingBadge: 'Pending',
        startLessonButton: 'Start',
        completedLessonBadge: 'Completed',
        previewBadge: 'Preview',
        inviteOnlyMessage: 'This course is invite-only.',
        approvalPendingMessage: 'Your enrollment is awaiting instructor approval.',
        invitedByBanner: (inviter) => `${inviter} has invited you to join this course.`,
        enrollSuccessToast: 'Enrollment confirmed.',
        enrollErrorToast: 'Could not enroll.',
        acceptInviteSuccessToast: 'Invitation accepted.',
        acceptInviteErrorToast: 'Could not accept the invitation.',
        emptyContentTitle: 'No content yet',
        emptyContentMessage: 'The course content has not been published yet.',
      };
  }
}
