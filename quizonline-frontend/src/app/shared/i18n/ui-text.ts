export {getUiText} from './ui-text/index';
export type {UiText} from './ui-text/index';

/**
 * String-literal union of the five supported UI languages.
 * Values match the wire codes used by ``LanguageEnumDto`` so existing
 * getters (which accept ``LanguageEnumDto | string | null | undefined``)
 * continue to work transparently.
 */
export type SupportedLang = 'fr' | 'en' | 'nl' | 'it' | 'es';
