import {SupportedLang} from '../i18n/ui-text';

/**
 * Per-language payload of localized fields for an LMS resource.
 *
 * Backend serializers nest translations under their language code (e.g.
 * ``{fr: {title: ..., description: ...}, en: {...}}``). This helper type
 * keeps that shape strongly typed at the keys without locking in the
 * exact set of fields, since each resource (Course, Section, Lesson,
 * ContentBlock, Certificate, …) carries its own field bag.
 */
export interface TranslationsMap {
  [lang: string]: Record<string, string>;
}

/**
 * Pick the best available value for ``field`` from ``translations``,
 * preferring the active UI language, then French, then English, then
 * any remaining language. Returns ``''`` when no payload contains a
 * non-empty value — callers can decide whether to render a placeholder.
 */
export function pickTranslation(
  translations: TranslationsMap | undefined | null,
  lang: SupportedLang,
  field: string,
): string {
  if (!translations) {
    return '';
  }
  const order: SupportedLang[] = [lang, 'fr', 'en'];
  for (const code of order) {
    const value = translations[code]?.[field];
    if (value) {
      return value;
    }
  }
  for (const payload of Object.values(translations)) {
    if (payload[field]) {
      return payload[field];
    }
  }
  return '';
}
