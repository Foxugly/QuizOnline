/** Parler-style translations map: ``{<lang>: {title, ...}}``. */
type Tr = Record<string, Record<string, string>> | undefined;

/** Title in ``lang``, else the first non-empty translation, else ``''``. */
export function titleIn(tr: Tr, lang: string): string {
  const own = tr?.[lang]?.['title']?.trim();
  if (own) return own;
  for (const v of Object.values(tr ?? {})) {
    const t = v?.['title']?.trim();
    if (t) return t;
  }
  return '';
}

/** Languages of ``langs`` whose title is missing or blank. */
export function missingLanguages(tr: Tr, langs: string[]): string[] {
  return langs.filter((l) => !tr?.[l]?.['title']?.trim());
}

/** New array with ``item`` placed by ``order`` (replacing the same reference). */
export function insertSorted<T extends {order: number}>(list: T[], item: T): T[] {
  return [...list.filter((x) => x !== item), item].sort((a, b) => a.order - b.order);
}
