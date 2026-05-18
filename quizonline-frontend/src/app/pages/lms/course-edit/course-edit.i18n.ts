import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Shell-level labels for the course-edit page. Includes the page title,
 * the four top-level tab labels and the publish/unpublish controls in
 * the page header. Each tab owns its own dictionary so this getter
 * stays narrow and the full course-author experience can grow
 * tab-by-tab without churning the shell.
 */
export interface LmsCourseEditUiText {
  pageTitle: string;
  tabInfo: string;
  tabStructure: string;
  tabEnrollment: string;
  tabAnalytics: string;
  publishButton: string;
  unpublishButton: string;
  publishedBadge: string;
  unpublishedBadge: string;
  publishSuccessToast: string;
  publishErrorToast: string;
  unpublishSuccessToast: string;
  unpublishErrorToast: string;
  loadErrorToast: string;
  loadingMessage: string;
}

export function getLmsCourseEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Édition du cours',
        tabInfo: 'Informations',
        tabStructure: 'Structure',
        tabEnrollment: 'Inscriptions',
        tabAnalytics: 'Analyses',
        publishButton: 'Publier',
        unpublishButton: 'Dépublier',
        publishedBadge: 'Publié',
        unpublishedBadge: 'Brouillon',
        publishSuccessToast: 'Cours publié.',
        publishErrorToast: 'La publication a échoué.',
        unpublishSuccessToast: 'Cours dépublié.',
        unpublishErrorToast: 'La dépublication a échoué.',
        loadErrorToast: 'Impossible de charger le cours.',
        loadingMessage: 'Chargement…',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus bewerken',
        tabInfo: 'Informatie',
        tabStructure: 'Structuur',
        tabEnrollment: 'Inschrijvingen',
        tabAnalytics: 'Analyses',
        publishButton: 'Publiceren',
        unpublishButton: 'Depubliceren',
        publishedBadge: 'Gepubliceerd',
        unpublishedBadge: 'Concept',
        publishSuccessToast: 'Cursus gepubliceerd.',
        publishErrorToast: 'Publiceren is mislukt.',
        unpublishSuccessToast: 'Cursus gedepubliceerd.',
        unpublishErrorToast: 'Depubliceren is mislukt.',
        loadErrorToast: 'Cursus kon niet worden geladen.',
        loadingMessage: 'Laden…',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Modifica corso',
        tabInfo: 'Informazioni',
        tabStructure: 'Struttura',
        tabEnrollment: 'Iscrizioni',
        tabAnalytics: 'Analisi',
        publishButton: 'Pubblica',
        unpublishButton: 'Spubblica',
        publishedBadge: 'Pubblicato',
        unpublishedBadge: 'Bozza',
        publishSuccessToast: 'Corso pubblicato.',
        publishErrorToast: 'Pubblicazione non riuscita.',
        unpublishSuccessToast: 'Corso spubblicato.',
        unpublishErrorToast: 'Spubblicazione non riuscita.',
        loadErrorToast: 'Impossibile caricare il corso.',
        loadingMessage: 'Caricamento…',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Editar curso',
        tabInfo: 'Información',
        tabStructure: 'Estructura',
        tabEnrollment: 'Inscripciones',
        tabAnalytics: 'Analíticas',
        publishButton: 'Publicar',
        unpublishButton: 'Despublicar',
        publishedBadge: 'Publicado',
        unpublishedBadge: 'Borrador',
        publishSuccessToast: 'Curso publicado.',
        publishErrorToast: 'No se pudo publicar el curso.',
        unpublishSuccessToast: 'Curso despublicado.',
        unpublishErrorToast: 'No se pudo despublicar el curso.',
        loadErrorToast: 'No se pudo cargar el curso.',
        loadingMessage: 'Cargando…',
      };
    default:
      return {
        pageTitle: 'Edit course',
        tabInfo: 'Information',
        tabStructure: 'Structure',
        tabEnrollment: 'Enrollment',
        tabAnalytics: 'Analytics',
        publishButton: 'Publish',
        unpublishButton: 'Unpublish',
        publishedBadge: 'Published',
        unpublishedBadge: 'Draft',
        publishSuccessToast: 'Course published.',
        publishErrorToast: 'Could not publish course.',
        unpublishSuccessToast: 'Course unpublished.',
        unpublishErrorToast: 'Could not unpublish course.',
        loadErrorToast: 'Could not load course.',
        loadingMessage: 'Loading…',
      };
  }
}
