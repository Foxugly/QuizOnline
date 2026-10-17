// language.ts


import {LanguageEnumDto} from '../app/api/generated';

// Fleet order (STANDARD-frontend-layout §5): fr · nl · en · it · es. This is
// display order only; the default language stays ``en`` (UserService).
export const SUPPORTED_LANGUAGES = [
  LanguageEnumDto.Fr,
  LanguageEnumDto.Nl,
  LanguageEnumDto.En,
  LanguageEnumDto.It,
  LanguageEnumDto.Es,
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function isSupportedLanguage(x: LanguageEnumDto | string): x is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(x as string);
}
