import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Page-scoped labels for the instructor course-list view at
 * ``/course/list``. Mirrors the schema used by the other admin
 * ``/list`` pages (subject-list, question-list, …) so the same
 * ``BulkActionsComponent`` and ``<app-page-header>``-less ``header-line``
 * pattern can be reused without per-page tweaks.
 */
export interface CourseListUiText {
  title: string;
  searchPlaceholder: string;
  bulk: {
    placeholder: string;
    apply: string;
    selectedCount: (n: number) => string;
    publish: string;
    unpublish: string;
    delete: string;
    confirmDeleteHeader: string;
    confirmDeleteMessage: (n: number) => string;
    confirmDeleteAccept: string;
    confirmDeleteCancel: string;
  };
  columns: {
    title: string;
    domain: string;
    level: string;
    enrollment: string;
    status: string;
    lessons: string;
    actions: string;
  };
  statusLabels: {
    published: string;
    draft: string;
  };
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  emptyMessage: string;
  catalogButton: string;
  publishSuccessToast: (n: number) => string;
  unpublishSuccessToast: (n: number) => string;
  deleteSuccessToast: (n: number) => string;
  bulkErrorToast: string;
}

const FR: CourseListUiText = {
  title: 'Cours',
  searchPlaceholder: 'Rechercher un cours…',
  bulk: {
    placeholder: 'Actions groupées…',
    apply: 'Appliquer',
    selectedCount: (n) => n <= 1 ? `${n} sélectionné` : `${n} sélectionnés`,
    publish: 'Publier',
    unpublish: 'Dépublier',
    delete: 'Supprimer',
    confirmDeleteHeader: 'Supprimer ces cours ?',
    confirmDeleteMessage: (n) =>
      `Supprimer définitivement ${n} cours, ainsi que toutes leurs leçons, inscriptions et progressions ? Cette opération est irréversible.`,
    confirmDeleteAccept: 'Supprimer',
    confirmDeleteCancel: 'Annuler',
  },
  columns: {
    title: 'Titre',
    domain: 'Domaine',
    level: 'Niveau',
    enrollment: 'Inscription',
    status: 'Statut',
    lessons: 'Leçons',
    actions: 'Actions',
  },
  statusLabels: {
    published: 'Publié',
    draft: 'Brouillon',
  },
  enrollmentBadge: {open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation'},
  emptyMessage: 'Aucun cours à gérer pour l\'instant.',
  catalogButton: 'Catalogue',
  publishSuccessToast: (n) => n <= 1 ? `${n} cours publié.` : `${n} cours publiés.`,
  unpublishSuccessToast: (n) => n <= 1 ? `${n} cours dépublié.` : `${n} cours dépubliés.`,
  deleteSuccessToast: (n) => n <= 1 ? `${n} cours supprimé.` : `${n} cours supprimés.`,
  bulkErrorToast: 'L\'opération groupée a échoué.',
};

const EN: CourseListUiText = {
  title: 'Courses',
  searchPlaceholder: 'Search a course…',
  bulk: {
    placeholder: 'Bulk actions…',
    apply: 'Apply',
    selectedCount: (n) => `${n} selected`,
    publish: 'Publish',
    unpublish: 'Unpublish',
    delete: 'Delete',
    confirmDeleteHeader: 'Delete these courses?',
    confirmDeleteMessage: (n) =>
      `Permanently delete ${n} course${n > 1 ? 's' : ''}, including every lesson, enrollment and progress entry? This cannot be undone.`,
    confirmDeleteAccept: 'Delete',
    confirmDeleteCancel: 'Cancel',
  },
  columns: {
    title: 'Title',
    domain: 'Domain',
    level: 'Level',
    enrollment: 'Enrollment',
    status: 'Status',
    lessons: 'Lessons',
    actions: 'Actions',
  },
  statusLabels: {
    published: 'Published',
    draft: 'Draft',
  },
  enrollmentBadge: {open: 'Open', approval: 'Approval', invite: 'Invite-only'},
  emptyMessage: 'No course to manage yet.',
  catalogButton: 'Catalog',
  publishSuccessToast: (n) => `${n} course${n > 1 ? 's' : ''} published.`,
  unpublishSuccessToast: (n) => `${n} course${n > 1 ? 's' : ''} unpublished.`,
  deleteSuccessToast: (n) => `${n} course${n > 1 ? 's' : ''} deleted.`,
  bulkErrorToast: 'Bulk operation failed.',
};

const NL: CourseListUiText = {
  title: 'Cursussen',
  searchPlaceholder: 'Zoek een cursus…',
  bulk: {
    placeholder: 'Bulkacties…',
    apply: 'Toepassen',
    selectedCount: (n) => `${n} geselecteerd`,
    publish: 'Publiceren',
    unpublish: 'Depubliceren',
    delete: 'Verwijderen',
    confirmDeleteHeader: 'Deze cursussen verwijderen?',
    confirmDeleteMessage: (n) =>
      `${n} cursus${n > 1 ? 'sen' : ''} definitief verwijderen, inclusief alle lessen, inschrijvingen en voortgang? Dit kan niet ongedaan worden gemaakt.`,
    confirmDeleteAccept: 'Verwijderen',
    confirmDeleteCancel: 'Annuleren',
  },
  columns: {
    title: 'Titel',
    domain: 'Domein',
    level: 'Niveau',
    enrollment: 'Inschrijving',
    status: 'Status',
    lessons: 'Lessen',
    actions: 'Acties',
  },
  statusLabels: {
    published: 'Gepubliceerd',
    draft: 'Concept',
  },
  enrollmentBadge: {open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging'},
  emptyMessage: 'Nog geen cursus om te beheren.',
  catalogButton: 'Catalogus',
  publishSuccessToast: (n) => `${n} cursus${n > 1 ? 'sen' : ''} gepubliceerd.`,
  unpublishSuccessToast: (n) => `${n} cursus${n > 1 ? 'sen' : ''} gedepubliceerd.`,
  deleteSuccessToast: (n) => `${n} cursus${n > 1 ? 'sen' : ''} verwijderd.`,
  bulkErrorToast: 'Bulkbewerking mislukt.',
};

const IT: CourseListUiText = {
  title: 'Corsi',
  searchPlaceholder: 'Cerca un corso…',
  bulk: {
    placeholder: 'Azioni in blocco…',
    apply: 'Applica',
    selectedCount: (n) => `${n} selezionat${n <= 1 ? 'o' : 'i'}`,
    publish: 'Pubblica',
    unpublish: 'Spubblica',
    delete: 'Elimina',
    confirmDeleteHeader: 'Eliminare questi corsi?',
    confirmDeleteMessage: (n) =>
      `Eliminare definitivamente ${n} cors${n > 1 ? 'i' : 'o'}, comprese tutte le lezioni, iscrizioni e progressi? Operazione irreversibile.`,
    confirmDeleteAccept: 'Elimina',
    confirmDeleteCancel: 'Annulla',
  },
  columns: {
    title: 'Titolo',
    domain: 'Dominio',
    level: 'Livello',
    enrollment: 'Iscrizione',
    status: 'Stato',
    lessons: 'Lezioni',
    actions: 'Azioni',
  },
  statusLabels: {
    published: 'Pubblicato',
    draft: 'Bozza',
  },
  enrollmentBadge: {open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito'},
  emptyMessage: 'Nessun corso da gestire al momento.',
  catalogButton: 'Catalogo',
  publishSuccessToast: (n) => `${n} cors${n > 1 ? 'i' : 'o'} pubblicat${n > 1 ? 'i' : 'o'}.`,
  unpublishSuccessToast: (n) => `${n} cors${n > 1 ? 'i' : 'o'} spubblicat${n > 1 ? 'i' : 'o'}.`,
  deleteSuccessToast: (n) => `${n} cors${n > 1 ? 'i' : 'o'} eliminat${n > 1 ? 'i' : 'o'}.`,
  bulkErrorToast: 'Operazione in blocco non riuscita.',
};

const ES: CourseListUiText = {
  title: 'Cursos',
  searchPlaceholder: 'Buscar un curso…',
  bulk: {
    placeholder: 'Acciones masivas…',
    apply: 'Aplicar',
    selectedCount: (n) => `${n} seleccionado${n > 1 ? 's' : ''}`,
    publish: 'Publicar',
    unpublish: 'Despublicar',
    delete: 'Eliminar',
    confirmDeleteHeader: '¿Eliminar estos cursos?',
    confirmDeleteMessage: (n) =>
      `¿Eliminar definitivamente ${n} curso${n > 1 ? 's' : ''}, junto con todas sus lecciones, inscripciones y progreso? Operación irreversible.`,
    confirmDeleteAccept: 'Eliminar',
    confirmDeleteCancel: 'Cancelar',
  },
  columns: {
    title: 'Título',
    domain: 'Dominio',
    level: 'Nivel',
    enrollment: 'Inscripción',
    status: 'Estado',
    lessons: 'Lecciones',
    actions: 'Acciones',
  },
  statusLabels: {
    published: 'Publicado',
    draft: 'Borrador',
  },
  enrollmentBadge: {open: 'Libre', approval: 'Aprobación', invite: 'Por invitación'},
  emptyMessage: 'Aún no hay cursos para gestionar.',
  catalogButton: 'Catálogo',
  publishSuccessToast: (n) => `${n} curso${n > 1 ? 's' : ''} publicado${n > 1 ? 's' : ''}.`,
  unpublishSuccessToast: (n) => `${n} curso${n > 1 ? 's' : ''} despublicado${n > 1 ? 's' : ''}.`,
  deleteSuccessToast: (n) => `${n} curso${n > 1 ? 's' : ''} eliminado${n > 1 ? 's' : ''}.`,
  bulkErrorToast: 'La operación masiva falló.',
};

const UI_TEXT: Record<LanguageEnumDto, CourseListUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getCourseListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseListUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? FR;
}
