import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type SubjectListUiText = {
  title: string;
  searchPlaceholder: string;
  bulk: {
    placeholder: string;
    apply: string;
    selectedCount: (n: number) => string;
  };
  columns: {
    name: string;
    active: string;
    domain: string;
    questions: string;
    actions: string;
  };
};

const FR: SubjectListUiText = {
  title: 'Sujets',
  searchPlaceholder: 'Rechercher…',
  bulk: {
    placeholder: 'Actions groupées…',
    apply: 'Appliquer',
    selectedCount: (n) => n <= 1 ? `${n} sélectionné` : `${n} sélectionnés`,
  },
  columns: {
    name: 'Nom',
    active: 'Actif',
    domain: 'Domaine',
    questions: 'Questions',
    actions: 'Actions',
  },
};

const EN: SubjectListUiText = {
  title: 'Subjects',
  searchPlaceholder: 'Search…',
  bulk: {
    placeholder: 'Bulk actions…',
    apply: 'Apply',
    selectedCount: (n) => `${n} selected`,
  },
  columns: {
    name: 'Name',
    active: 'Active',
    domain: 'Domain',
    questions: 'Questions',
    actions: 'Actions',
  },
};

const NL: SubjectListUiText = {
  title: 'Onderwerpen',
  searchPlaceholder: 'Zoeken…',
  bulk: {
    placeholder: 'Bulkacties…',
    apply: 'Toepassen',
    selectedCount: (n) => `${n} geselecteerd`,
  },
  columns: {
    name: 'Naam',
    active: 'Actief',
    domain: 'Domein',
    questions: 'Vragen',
    actions: 'Acties',
  },
};

const IT: SubjectListUiText = {
  title: 'Argomenti',
  searchPlaceholder: 'Cerca…',
  bulk: {
    placeholder: 'Azioni in blocco…',
    apply: 'Applica',
    selectedCount: (n) => `${n} selezionat${n <= 1 ? 'o' : 'i'}`,
  },
  columns: {
    name: 'Nome',
    active: 'Attivo',
    domain: 'Dominio',
    questions: 'Domande',
    actions: 'Azioni',
  },
};

const ES: SubjectListUiText = {
  title: 'Temas',
  searchPlaceholder: 'Buscar…',
  bulk: {
    placeholder: 'Acciones masivas…',
    apply: 'Aplicar',
    selectedCount: (n) => `${n} seleccionado${n > 1 ? 's' : ''}`,
  },
  columns: {
    name: 'Nombre',
    active: 'Activo',
    domain: 'Dominio',
    questions: 'Preguntas',
    actions: 'Acciones',
  },
};

const UI_TEXT: Record<LanguageEnumDto, SubjectListUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getSubjectListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectListUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? FR;
}
