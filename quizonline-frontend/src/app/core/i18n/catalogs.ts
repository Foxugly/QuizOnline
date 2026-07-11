import type {SupportedLanguage} from '../../../environments/language';

import uiTextEn from '../../shared/i18n/ui-text/en.json';
import uiTextEs from '../../shared/i18n/ui-text/es.json';
import uiTextFr from '../../shared/i18n/ui-text/fr.json';
import uiTextIt from '../../shared/i18n/ui-text/it.json';
import uiTextNl from '../../shared/i18n/ui-text/nl.json';

import editorEn from '../../shared/i18n/editor-ui-text/en.json';
import editorEs from '../../shared/i18n/editor-ui-text/es.json';
import editorFr from '../../shared/i18n/editor-ui-text/fr.json';
import editorIt from '../../shared/i18n/editor-ui-text/it.json';
import editorNl from '../../shared/i18n/editor-ui-text/nl.json';

/**
 * Bundled Transloco catalogs, keyed by language code.
 *
 * The fleet convention (ref: PushIT_frontend) bundles the translation catalogs
 * as imported JSON and serves them to Transloco through a synchronous loader —
 * no HTTP. QuizOnline renders text through the typed ``UiTextService`` façade,
 * so Transloco itself is wired for fleet conformance (provider, active-lang,
 * test setup, ``| transloco`` availability) rather than day-to-day rendering.
 *
 * Each language merges the core ``ui-text`` catalog at the top level and nests
 * the ``editor-ui-text`` catalog under ``editor``. Page catalogs are folded in
 * as they migrate to JSON (see
 * docs/superpowers/plans/2026-07-11-i18n-transloco-migration.md).
 */
export const CATALOGS: Record<SupportedLanguage, Record<string, unknown>> = {
  en: {...uiTextEn, editor: editorEn},
  fr: {...uiTextFr, editor: editorFr},
  nl: {...uiTextNl, editor: editorNl},
  it: {...uiTextIt, editor: editorIt},
  es: {...uiTextEs, editor: editorEs},
};
