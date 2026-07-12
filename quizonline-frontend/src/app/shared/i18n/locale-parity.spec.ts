/**
 * Locale parity for the core JSON catalogs: every non-reference language
 * (fr/nl/it/es) must expose the exact same set of key paths as the ``en``
 * reference — no missing keys, no extra keys. Leaves (strings) and any array
 * are treated as path endpoints. Modelled on PushIT_frontend's
 * ``copy-locale-parity.spec.ts``.
 */
import uiTextEn from './ui-text/en.json';
import uiTextEs from './ui-text/es.json';
import uiTextFr from './ui-text/fr.json';
import uiTextIt from './ui-text/it.json';
import uiTextNl from './ui-text/nl.json';

import editorEn from './editor-ui-text/en.json';
import editorEs from './editor-ui-text/es.json';
import editorFr from './editor-ui-text/fr.json';
import editorIt from './editor-ui-text/it.json';
import editorNl from './editor-ui-text/nl.json';

function collectPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const out: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const child = (value as Record<string, unknown>)[key];
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(...collectPaths(child, path));
  }
  return out;
}

const catalogs: Array<{name: string; en: unknown; others: Record<string, unknown>}> = [
  {name: 'ui-text', en: uiTextEn, others: {fr: uiTextFr, nl: uiTextNl, it: uiTextIt, es: uiTextEs}},
  {name: 'editor-ui-text', en: editorEn, others: {fr: editorFr, nl: editorNl, it: editorIt, es: editorEs}},
];

describe('core i18n locale parity', () => {
  for (const {name, en, others} of catalogs) {
    const reference = collectPaths(en);

    describe(name, () => {
      for (const [lang, catalog] of Object.entries(others)) {
        it(`${lang} has the same key paths as en`, () => {
          const paths = collectPaths(catalog);
          const missing = reference.filter((p) => !paths.includes(p));
          const extra = paths.filter((p) => !reference.includes(p));
          expect({missing, extra}).toEqual({missing: [], extra: []});
        });
      }
    });
  }
});
