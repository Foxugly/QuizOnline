import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCatalogUiText {
  pageTitle: string;
  filterByLevelLabel: string;
  filterByLanguageLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyMessage: string;
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  viewButton: string;
  createCourseButton: string;
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
        searchPlaceholder: 'Rechercher un cours…',
        emptyTitle: 'Aucun cours disponible',
        emptyMessage: 'Aucun cours publié ne correspond à votre sélection.',
        enrollmentBadge: {open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation'},
        viewButton: 'Voir',
        createCourseButton: 'Créer un cours',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursuscatalogus',
        filterByLevelLabel: 'Niveau',
        filterByLanguageLabel: 'Taal',
        searchPlaceholder: 'Zoek een cursus…',
        emptyTitle: 'Geen cursus beschikbaar',
        emptyMessage: 'Geen gepubliceerde cursus komt overeen met uw selectie.',
        enrollmentBadge: {open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging'},
        viewButton: 'Bekijken',
        createCourseButton: 'Cursus aanmaken',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Catalogo dei corsi',
        filterByLevelLabel: 'Livello',
        filterByLanguageLabel: 'Lingua',
        searchPlaceholder: 'Cerca un corso…',
        emptyTitle: 'Nessun corso disponibile',
        emptyMessage: 'Nessun corso pubblicato corrisponde alla selezione.',
        enrollmentBadge: {open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito'},
        viewButton: 'Visualizza',
        createCourseButton: 'Crea un corso',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Catálogo de cursos',
        filterByLevelLabel: 'Nivel',
        filterByLanguageLabel: 'Idioma',
        searchPlaceholder: 'Buscar un curso…',
        emptyTitle: 'Sin cursos disponibles',
        emptyMessage: 'Ningún curso publicado coincide con su selección.',
        enrollmentBadge: {open: 'Libre', approval: 'Aprobación', invite: 'Por invitación'},
        viewButton: 'Ver',
        createCourseButton: 'Crear un curso',
      };
    default:
      return {
        pageTitle: 'Course catalog',
        filterByLevelLabel: 'Level',
        filterByLanguageLabel: 'Language',
        searchPlaceholder: 'Search a course…',
        emptyTitle: 'No course available',
        emptyMessage: 'No published course matches your filters.',
        enrollmentBadge: {open: 'Open', approval: 'Approval', invite: 'Invite-only'},
        viewButton: 'View',
        createCourseButton: 'Create a course',
      };
  }
}
