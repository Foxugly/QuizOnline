import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type SavedAtUiText = {
  /** Label rendered next to the formatted time, e.g. "Enregistré à 14:32". */
  savedAtLabel: (time: string) => string;
  /** BCP-47 locale used by ``Intl.DateTimeFormat`` for the HH:MM rendering. */
  locale: string;
};

const SAVED_AT_UI_TEXT: Record<LanguageEnumDto, SavedAtUiText> = {
  [LanguageEnumDto.Fr]: {
    savedAtLabel: (time) => `Enregistré à ${time}`,
    locale: 'fr-FR',
  },
  [LanguageEnumDto.En]: {
    savedAtLabel: (time) => `Saved at ${time}`,
    locale: 'en-GB',
  },
  [LanguageEnumDto.Nl]: {
    savedAtLabel: (time) => `Opgeslagen om ${time}`,
    locale: 'nl-NL',
  },
  [LanguageEnumDto.It]: {
    savedAtLabel: (time) => `Salvato alle ${time}`,
    locale: 'it-IT',
  },
  [LanguageEnumDto.Es]: {
    savedAtLabel: (time) => `Guardado a las ${time}`,
    locale: 'es-ES',
  },
};

export function getSavedAtUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SavedAtUiText {
  return SAVED_AT_UI_TEXT[lang as LanguageEnumDto] ?? SAVED_AT_UI_TEXT[LanguageEnumDto.Fr];
}
