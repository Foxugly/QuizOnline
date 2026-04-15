import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export function languageLocale(lang: LanguageEnumDto | null | undefined): string {
  switch (lang) {
    case LanguageEnumDto.Fr:
      return 'fr-BE';
    case LanguageEnumDto.Nl:
      return 'nl-BE';
    case LanguageEnumDto.It:
      return 'it-IT';
    case LanguageEnumDto.Es:
      return 'es-ES';
    case LanguageEnumDto.En:
    default:
      return 'en-US';
  }
}

export function formatLocalizedDateTime(
  value: string | Date | null | undefined,
  lang: LanguageEnumDto | null | undefined,
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
