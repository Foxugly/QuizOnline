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

/**
 * Optimistic outcome of dropping lesson ``lessonId`` at ``toIndex`` in
 * section ``toSection`` (same or other section). Lessons are read in array
 * order; every section's lessons get ``order`` renumbered from 0. Returns
 * ``sections`` itself when the lesson is not found.
 */
export function applyLessonDrop<S extends {id: number; lessons?: L[]}, L extends {id: number; order: number}>(
  sections: S[], lessonId: number, toSection: number, toIndex: number): S[] {
  const lesson = sections.flatMap((s) => s.lessons ?? []).find((l) => l.id === lessonId);
  if (!lesson) return sections;
  const stripped = sections.map((s) => ({...s, lessons: (s.lessons ?? []).filter((l) => l.id !== lessonId)}));
  return stripped.map((s) => {
    if (s.id !== toSection) return {...s, lessons: s.lessons.map((l, i) => ({...l, order: i}))};
    const list = [...s.lessons];
    list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, lesson);
    return {...s, lessons: list.map((l, i) => ({...l, order: i}))};
  });
}
