import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCourseDetailUiText {
  pageTitle: string;
  loading: string;
  sectionsHeading: string;
  learningObjectivesHeading: string;
  durationLabel: string;
  enrollButton: string;
  continueButton: string;
  editButton: string;
  enrolledBadge: string;
  pendingBadge: string;
  startLessonButton: string;
  completedLessonBadge: string;
  previewBadge: string;
  inviteOnlyMessage: string;
  approvalPendingMessage: string;
  enrollSuccessToast: string;
  enrollErrorToast: string;
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
        continueButton: 'Reprendre',
        editButton: 'Modifier',
        enrolledBadge: 'Inscrit',
        pendingBadge: 'En attente',
        startLessonButton: 'Commencer',
        completedLessonBadge: 'Terminé',
        previewBadge: 'Aperçu',
        inviteOnlyMessage: 'Ce cours est sur invitation uniquement.',
        approvalPendingMessage: 'Votre inscription attend la validation d\'un instructeur.',
        enrollSuccessToast: 'Inscription confirmée.',
        enrollErrorToast: "Impossible de s'inscrire.",
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
        continueButton: 'Hervatten',
        editButton: 'Bewerken',
        enrolledBadge: 'Ingeschreven',
        pendingBadge: 'In afwachting',
        startLessonButton: 'Beginnen',
        completedLessonBadge: 'Voltooid',
        previewBadge: 'Voorbeeld',
        inviteOnlyMessage: 'Deze cursus is alleen op uitnodiging.',
        approvalPendingMessage: 'Je inschrijving wacht op goedkeuring van een instructeur.',
        enrollSuccessToast: 'Inschrijving bevestigd.',
        enrollErrorToast: 'Inschrijven mislukt.',
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
        continueButton: 'Riprendi',
        editButton: 'Modifica',
        enrolledBadge: 'Iscritto',
        pendingBadge: 'In attesa',
        startLessonButton: 'Inizia',
        completedLessonBadge: 'Completato',
        previewBadge: 'Anteprima',
        inviteOnlyMessage: 'Questo corso è solo su invito.',
        approvalPendingMessage: 'La tua iscrizione attende l\'approvazione di un istruttore.',
        enrollSuccessToast: 'Iscrizione confermata.',
        enrollErrorToast: 'Iscrizione non riuscita.',
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
        continueButton: 'Reanudar',
        editButton: 'Editar',
        enrolledBadge: 'Inscrito',
        pendingBadge: 'Pendiente',
        startLessonButton: 'Comenzar',
        completedLessonBadge: 'Completado',
        previewBadge: 'Vista previa',
        inviteOnlyMessage: 'Este curso es solo por invitación.',
        approvalPendingMessage: 'Tu inscripción está pendiente de aprobación.',
        enrollSuccessToast: 'Inscripción confirmada.',
        enrollErrorToast: 'No se pudo inscribir.',
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
        continueButton: 'Continue',
        editButton: 'Edit',
        enrolledBadge: 'Enrolled',
        pendingBadge: 'Pending',
        startLessonButton: 'Start',
        completedLessonBadge: 'Completed',
        previewBadge: 'Preview',
        inviteOnlyMessage: 'This course is invite-only.',
        approvalPendingMessage: 'Your enrollment is awaiting instructor approval.',
        enrollSuccessToast: 'Enrollment confirmed.',
        enrollErrorToast: 'Could not enroll.',
        emptyContentTitle: 'No content yet',
        emptyContentMessage: 'The course content has not been published yet.',
      };
  }
}
