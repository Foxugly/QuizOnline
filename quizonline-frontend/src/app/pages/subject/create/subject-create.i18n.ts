import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type SubjectCreateUiText = {
  title: string;
  subtitle: string;
  emptyLanguagesMessage: string;
  /** Toast / banner strings surfaced by ``subject-create.ts``. */
  toast: {
    loadDomainsFailed: string;
    loadDomainFailed: string;
    nameRequired: string;
    createFailed: string;
    translationFailed: string;
  };
};

const FR: SubjectCreateUiText = {
  title: 'Créer un sujet',
  subtitle: 'Choix du domaine et traductions',
  emptyLanguagesMessage: 'Ce domaine n\'a pas de langues configurées.',
  toast: {
    loadDomainsFailed: 'Impossible de charger les domaines.',
    loadDomainFailed: 'Impossible de charger le domaine sélectionné.',
    nameRequired: 'Merci de remplir au minimum le champ « nom » pour chaque langue.',
    createFailed: 'Erreur lors de la création du sujet.',
    translationFailed: 'Erreur lors de la traduction.',
  },
};

const EN: SubjectCreateUiText = {
  title: 'Create subject',
  subtitle: 'Domain selection and translations',
  emptyLanguagesMessage: 'This domain has no configured languages.',
  toast: {
    loadDomainsFailed: 'Unable to load the domains.',
    loadDomainFailed: 'Unable to load the selected domain.',
    nameRequired: 'Please fill in at least the "name" field for each language.',
    createFailed: 'Error while creating the subject.',
    translationFailed: 'Error while translating.',
  },
};

const NL: SubjectCreateUiText = {
  title: 'Onderwerp maken',
  subtitle: 'Domeinkeuze en vertalingen',
  emptyLanguagesMessage: 'Dit domein heeft geen geconfigureerde talen.',
  toast: {
    loadDomainsFailed: 'Kan de domeinen niet laden.',
    loadDomainFailed: 'Kan het geselecteerde domein niet laden.',
    nameRequired: 'Vul minstens het veld "naam" voor elke taal in.',
    createFailed: 'Fout bij het maken van het onderwerp.',
    translationFailed: 'Fout bij het vertalen.',
  },
};

const IT: SubjectCreateUiText = {
  title: 'Crea argomento',
  subtitle: 'Scelta del dominio e traduzioni',
  emptyLanguagesMessage: 'Questo dominio non ha lingue configurate.',
  toast: {
    loadDomainsFailed: 'Impossibile caricare i domini.',
    loadDomainFailed: 'Impossibile caricare il dominio selezionato.',
    nameRequired: 'Compila almeno il campo "nome" per ogni lingua.',
    createFailed: 'Errore durante la creazione dell\'argomento.',
    translationFailed: 'Errore durante la traduzione.',
  },
};

const ES: SubjectCreateUiText = {
  title: 'Crear tema',
  subtitle: 'Elección del dominio y traducciones',
  emptyLanguagesMessage: 'Este dominio no tiene idiomas configurados.',
  toast: {
    loadDomainsFailed: 'No se pueden cargar los dominios.',
    loadDomainFailed: 'No se puede cargar el dominio seleccionado.',
    nameRequired: 'Rellena al menos el campo "nombre" para cada idioma.',
    createFailed: 'Error al crear el tema.',
    translationFailed: 'Error al traducir.',
  },
};

const UI_TEXT: Record<LanguageEnumDto, SubjectCreateUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getSubjectCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectCreateUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? FR;
}
