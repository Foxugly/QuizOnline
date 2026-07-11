/**
 * Tiny formatting helpers for JSON i18n catalogs.
 *
 * JSON catalogs cannot hold functions, so parametric strings are stored as
 * templates with ``{name}`` placeholders and rendered through these helpers.
 * Kept dependency-free and pure so they are trivially unit-testable and usable
 * from both templates (via the façade) and TypeScript.
 */

export type InterpParams = Record<string, string | number>;

/**
 * Replace every ``{key}`` in ``template`` with ``params[key]``. Unknown
 * placeholders are left verbatim (so a missing param is visible, not silently
 * blanked).
 */
export function interp(template: string, params: InterpParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

/** Singular / plural template pair. */
export interface PluralForms {
  one: string;
  other: string;
}

/**
 * Pick the singular or plural form by ``n`` then interpolate. ``n`` is exposed
 * to the template as ``{n}``. The threshold is ``n <= 1 → one`` to match the
 * legacy home-grown catalogs (which used ``n <= 1`` / ``n > 1``).
 */
export function plural(forms: PluralForms, n: number, params: InterpParams = {}): string {
  const form = n <= 1 ? forms.one : forms.other;
  return interp(form, { n, ...params });
}
