import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainCreateUiText = {
  toastErrorSummary: string;
  errors: {
    loadFailed: string;
    translationFailed: string;
    formInvalid: string;
    missingLanguageIds: string;
    saveFailed: string;
  };
};

const FR: DomainCreateUiText = {
  toastErrorSummary: 'Erreur',
  errors: {
    loadFailed: 'Erreur lors du chargement initial.',
    translationFailed: 'Erreur lors de la traduction.',
    formInvalid: 'Le formulaire contient des erreurs.',
    missingLanguageIds: 'Impossible de déterminer les identifiants des langues (liste non chargée ?).',
    saveFailed: 'Erreur backend lors de la création.',
  },
};

const EN: DomainCreateUiText = {
  toastErrorSummary: 'Error',
  errors: {
    loadFailed: 'Error while loading initial data.',
    translationFailed: 'Error while translating.',
    formInvalid: 'The form contains errors.',
    missingLanguageIds: 'Cannot resolve language identifiers (list not loaded?).',
    saveFailed: 'Backend error while creating.',
  },
};

const NL: DomainCreateUiText = {
  toastErrorSummary: 'Fout',
  errors: {
    loadFailed: 'Fout bij het laden van de gegevens.',
    translationFailed: 'Fout bij het vertalen.',
    formInvalid: 'Het formulier bevat fouten.',
    missingLanguageIds: 'Kan de taal-IDs niet bepalen (lijst niet geladen?).',
    saveFailed: 'Backend-fout bij het aanmaken.',
  },
};

const IT: DomainCreateUiText = {
  toastErrorSummary: 'Errore',
  errors: {
    loadFailed: 'Errore durante il caricamento iniziale.',
    translationFailed: 'Errore durante la traduzione.',
    formInvalid: 'Il modulo contiene errori.',
    missingLanguageIds: 'Impossibile determinare gli ID delle lingue (elenco non caricato?).',
    saveFailed: 'Errore del backend durante la creazione.',
  },
};

const ES: DomainCreateUiText = {
  toastErrorSummary: 'Error',
  errors: {
    loadFailed: 'Error durante la carga inicial.',
    translationFailed: 'Error durante la traducción.',
    formInvalid: 'El formulario contiene errores.',
    missingLanguageIds: 'No se pueden determinar los IDs de los idiomas (¿lista no cargada?).',
    saveFailed: 'Error del backend al crear.',
  },
};

const DICT: Record<LanguageEnumDto, DomainCreateUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getDomainCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainCreateUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
