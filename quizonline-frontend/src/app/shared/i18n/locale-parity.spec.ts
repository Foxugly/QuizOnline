/**
 * Locale parity for the core JSON catalogs: every non-reference language
 * (fr/nl/it/es) must expose the exact same set of key paths as the ``en``
 * reference — no missing keys, no extra keys. Leaves (strings) and any array
 * are treated as path endpoints. Modelled on PushIT_frontend's
 * ``copy-locale-parity.spec.ts``.
 */
// Les catalogues vivent desormais dans public/i18n/<lang>.json
// (STANDARD-frontend-layout.md §5bis). Un seul fichier par langue porte
// desormais le shell (`ui`), l'editeur (`editor`) et les 50 dictionnaires de
// page (`pages.*`) : le controle de parite couvre donc tout d'un coup, la ou il
// ne voyait que deux catalogues sur cinquante-deux.
//
// Suffixe `Catalog` obligatoire : `import it from ...` masquerait it().
import enCatalog from '../../../../public/i18n/en.json';
import esCatalog from '../../../../public/i18n/es.json';
import frCatalog from '../../../../public/i18n/fr.json';
import itCatalog from '../../../../public/i18n/it.json';
import nlCatalog from '../../../../public/i18n/nl.json';

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
  {
    name: 'public/i18n',
    en: enCatalog,
    others: {fr: frCatalog, nl: nlCatalog, it: itCatalog, es: esCatalog},
  },
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
