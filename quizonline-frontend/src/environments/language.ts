// language.ts


import {LanguageEnum} from '../app/api/generated';

export const SUPPORTED_LANGUAGES = [
  LanguageEnum.En,
  LanguageEnum.Fr,
  LanguageEnum.Nl,
  LanguageEnum.It,
  LanguageEnum.Es,
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function isSupportedLanguage(x: LanguageEnum | string): x is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(x as string);
}
