/**
 * Pick the default language to activate on a multilingual editor:
 * - prefer the user's current UI language when it is listed in the
 *   surrounding domain's ``allowed_languages``,
 * - otherwise fall back to the first allowed language,
 * - finally default to ``'fr'`` if the available list is empty (only
 *   happens before the parent course detail has loaded).
 */
export function pickDefaultLang(availableLangs: readonly string[], userLang: string | null | undefined): string {
  const u = (userLang ?? '').toString();
  if (u && availableLangs.includes(u)) {
    return u;
  }
  return availableLangs[0] ?? 'fr';
}
