import {LanguageEnumDto} from '../../api/generated/model/language-enum';

type LangCode = `${LanguageEnumDto}`;

export function selectTranslation<T>(
  translations: Record<string, T> | null | undefined,
  lang: LangCode,
  fallback: LangCode = 'fr'
): T | null {
  if (!translations) {
    return null;
  }

  return (
    translations[lang] ??
    translations[fallback] ??
    Object.values(translations)[0] ??
    null
  );
}
