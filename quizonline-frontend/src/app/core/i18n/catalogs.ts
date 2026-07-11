import type {SupportedLanguage} from '../../../environments/language';

/**
 * Bundled Transloco catalogs, keyed by language code.
 *
 * The fleet convention (ref: PushIT_frontend) bundles the translation catalogs
 * as imported JSON and serves them to Transloco through a synchronous loader —
 * no HTTP. QuizOnline renders text through the typed ``UiTextService`` façade,
 * so Transloco itself is wired for fleet conformance (provider, active-lang,
 * test setup, ``| transloco`` availability) rather than day-to-day rendering.
 *
 * Populated with the real per-language catalogs as each is migrated from TS to
 * JSON (see docs/superpowers/plans/2026-07-11-i18n-transloco-migration.md).
 */
export const CATALOGS: Record<SupportedLanguage, Record<string, unknown>> = {
  en: {},
  fr: {},
  nl: {},
  it: {},
  es: {},
};
