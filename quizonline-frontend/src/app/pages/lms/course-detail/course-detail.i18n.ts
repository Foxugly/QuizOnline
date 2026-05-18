import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCourseDetailUiText {
  pageTitle: string;
  loading: string;
  sectionsHeading: string;
  durationLabel: string;
  enrollButton: string;
  enrolledBadge: string;
  pendingBadge: string;
  startLessonButton: string;
  completedLessonBadge: string;
  previewBadge: string;
  inviteOnlyMessage: string;
  approvalPendingMessage: string;
  enrollSuccessToast: string;
  enrollErrorToast: string;
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
        durationLabel: '{n} min',
        enrollButton: "M'inscrire",
        enrolledBadge: 'Inscrit',
        pendingBadge: 'En attente',
        startLessonButton: 'Commencer',
        completedLessonBadge: 'Terminé',
        previewBadge: 'Aperçu',
        inviteOnlyMessage: 'Ce cours est sur invitation uniquement.',
        approvalPendingMessage: 'Votre inscription attend la validation d\'un instructeur.',
        enrollSuccessToast: 'Inscription confirmée.',
        enrollErrorToast: "Impossible de s'inscrire.",
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus',
        loading: 'Laden…',
        sectionsHeading: 'Cursusinhoud',
        durationLabel: '{n} min',
        enrollButton: 'Inschrijven',
        enrolledBadge: 'Ingeschreven',
        pendingBadge: 'In afwachting',
        startLessonButton: 'Beginnen',
        completedLessonBadge: 'Voltooid',
        previewBadge: 'Voorbeeld',
        inviteOnlyMessage: 'Deze cursus is alleen op uitnodiging.',
        approvalPendingMessage: 'Je inschrijving wacht op goedkeuring van een instructeur.',
        enrollSuccessToast: 'Inschrijving bevestigd.',
        enrollErrorToast: 'Inschrijven mislukt.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Corso',
        loading: 'Caricamento…',
        sectionsHeading: 'Contenuto del corso',
        durationLabel: '{n} min',
        enrollButton: 'Iscriviti',
        enrolledBadge: 'Iscritto',
        pendingBadge: 'In attesa',
        startLessonButton: 'Inizia',
        completedLessonBadge: 'Completato',
        previewBadge: 'Anteprima',
        inviteOnlyMessage: 'Questo corso è solo su invito.',
        approvalPendingMessage: 'La tua iscrizione attende l\'approvazione di un istruttore.',
        enrollSuccessToast: 'Iscrizione confermata.',
        enrollErrorToast: 'Iscrizione non riuscita.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Curso',
        loading: 'Cargando…',
        sectionsHeading: 'Contenido del curso',
        durationLabel: '{n} min',
        enrollButton: 'Inscribirme',
        enrolledBadge: 'Inscrito',
        pendingBadge: 'Pendiente',
        startLessonButton: 'Comenzar',
        completedLessonBadge: 'Completado',
        previewBadge: 'Vista previa',
        inviteOnlyMessage: 'Este curso es solo por invitación.',
        approvalPendingMessage: 'Tu inscripción está pendiente de aprobación.',
        enrollSuccessToast: 'Inscripción confirmada.',
        enrollErrorToast: 'No se pudo inscribir.',
      };
    default:
      return {
        pageTitle: 'Course',
        loading: 'Loading…',
        sectionsHeading: 'Course content',
        durationLabel: '{n} min',
        enrollButton: 'Enroll',
        enrolledBadge: 'Enrolled',
        pendingBadge: 'Pending',
        startLessonButton: 'Start',
        completedLessonBadge: 'Completed',
        previewBadge: 'Preview',
        inviteOnlyMessage: 'This course is invite-only.',
        approvalPendingMessage: 'Your enrollment is awaiting instructor approval.',
        enrollSuccessToast: 'Enrollment confirmed.',
        enrollErrorToast: 'Could not enroll.',
      };
  }
}
