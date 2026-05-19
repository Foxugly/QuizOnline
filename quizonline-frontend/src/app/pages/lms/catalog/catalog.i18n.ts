import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCatalogUiText {
  pageTitle: string;
  filterByLevelLabel: string;
  filterByLanguageLabel: string;
  filterByDomainLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyMessage: string;
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  viewButton: string;
  createCourseButton: string;
  /** Top-right CTA on the catalog header that routes instructors to
   *  the admin ``/lms/course/list`` table view. Visible only when the
   *  caller manages at least one domain. */
  listButton: string;
  /** Card meta: lesson count, e.g. "12 lessons". */
  lessonCount: (n: number) => string;
  /** Card meta: total duration formatted as "Xh Ym" or "Y min". */
  duration: (minutes: number) => string;
  /** Badge surfaced on the card when the caller is already enrolled. */
  enrolledBadge: string;
  /** Continue-learning CTA label shown instead of "View" once enrolled. */
  continueButton: string;
  /** Per-card publish-status badge — surfaced only for cards the caller
   *  can manage, so plain learners never see them. Same vocabulary as
   *  :type:`LmsCourseListUiText.statusLabels` so the two instructor
   *  surfaces stay consistent. */
  statusLabels: {
    published: string;
    draft: string;
  };
}

export function getLmsCatalogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCatalogUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Catalogue des cours',
        filterByLevelLabel: 'Niveau',
        filterByLanguageLabel: 'Langue',
        filterByDomainLabel: 'Domaine',
        searchPlaceholder: 'Rechercher un cours…',
        emptyTitle: 'Aucun cours disponible',
        emptyMessage: 'Aucun cours publié ne correspond à votre sélection.',
        enrollmentBadge: {open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation'},
        viewButton: 'Voir',
        createCourseButton: 'Créer un cours',
        listButton: 'Liste',
        lessonCount: (n) => `${n} leçon${n > 1 ? 's' : ''}`,
        duration: (m) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 > 0 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`,
        enrolledBadge: 'Inscrit',
        continueButton: 'Reprendre',
        statusLabels: {published: 'Publié', draft: 'Brouillon'},
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursuscatalogus',
        filterByLevelLabel: 'Niveau',
        filterByLanguageLabel: 'Taal',
        filterByDomainLabel: 'Domein',
        searchPlaceholder: 'Zoek een cursus…',
        emptyTitle: 'Geen cursus beschikbaar',
        emptyMessage: 'Geen gepubliceerde cursus komt overeen met uw selectie.',
        enrollmentBadge: {open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging'},
        viewButton: 'Bekijken',
        createCourseButton: 'Cursus aanmaken',
        listButton: 'Lijst',
        lessonCount: (n) => `${n} les${n > 1 ? 'sen' : ''}`,
        duration: (m) => m >= 60 ? `${Math.floor(m / 60)} u ${m % 60 > 0 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`,
        enrolledBadge: 'Ingeschreven',
        continueButton: 'Hervatten',
        statusLabels: {published: 'Gepubliceerd', draft: 'Concept'},
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Catalogo dei corsi',
        filterByLevelLabel: 'Livello',
        filterByLanguageLabel: 'Lingua',
        filterByDomainLabel: 'Dominio',
        searchPlaceholder: 'Cerca un corso…',
        emptyTitle: 'Nessun corso disponibile',
        emptyMessage: 'Nessun corso pubblicato corrisponde alla selezione.',
        enrollmentBadge: {open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito'},
        viewButton: 'Visualizza',
        createCourseButton: 'Crea un corso',
        listButton: 'Elenco',
        lessonCount: (n) => `${n} lezion${n > 1 ? 'i' : 'e'}`,
        duration: (m) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 > 0 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`,
        enrolledBadge: 'Iscritto',
        continueButton: 'Riprendi',
        statusLabels: {published: 'Pubblicato', draft: 'Bozza'},
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Catálogo de cursos',
        filterByLevelLabel: 'Nivel',
        filterByLanguageLabel: 'Idioma',
        filterByDomainLabel: 'Dominio',
        searchPlaceholder: 'Buscar un curso…',
        emptyTitle: 'Sin cursos disponibles',
        emptyMessage: 'Ningún curso publicado coincide con su selección.',
        enrollmentBadge: {open: 'Libre', approval: 'Aprobación', invite: 'Por invitación'},
        viewButton: 'Ver',
        createCourseButton: 'Crear un curso',
        listButton: 'Lista',
        lessonCount: (n) => `${n} lección${n > 1 ? 'es' : ''}`,
        duration: (m) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 > 0 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`,
        enrolledBadge: 'Inscrito',
        continueButton: 'Reanudar',
        statusLabels: {published: 'Publicado', draft: 'Borrador'},
      };
    default:
      return {
        pageTitle: 'Course catalog',
        filterByLevelLabel: 'Level',
        filterByLanguageLabel: 'Language',
        filterByDomainLabel: 'Domain',
        searchPlaceholder: 'Search a course…',
        emptyTitle: 'No course available',
        emptyMessage: 'No published course matches your filters.',
        enrollmentBadge: {open: 'Open', approval: 'Approval', invite: 'Invite-only'},
        viewButton: 'View',
        createCourseButton: 'Create a course',
        listButton: 'List',
        lessonCount: (n) => `${n} lesson${n > 1 ? 's' : ''}`,
        duration: (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? (m % 60) + 'min' : ''}`.trim() : `${m} min`,
        enrolledBadge: 'Enrolled',
        continueButton: 'Continue',
        statusLabels: {published: 'Published', draft: 'Draft'},
      };
  }
}
