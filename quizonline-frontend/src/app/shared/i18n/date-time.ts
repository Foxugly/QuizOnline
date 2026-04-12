import {LanguageEnum} from '../../api/generated';

export function languageLocale(lang: LanguageEnum | null | undefined): string {
  switch (lang) {
    case LanguageEnum.Fr:
      return 'fr-BE';
    case LanguageEnum.Nl:
      return 'nl-BE';
    case LanguageEnum.It:
      return 'it-IT';
    case LanguageEnum.Es:
      return 'es-ES';
    case LanguageEnum.En:
    default:
      return 'en-US';
  }
}

export function formatLocalizedDateTime(
  value: string | Date | null | undefined,
  lang: LanguageEnum | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(languageLocale(lang), options).format(date);
}
