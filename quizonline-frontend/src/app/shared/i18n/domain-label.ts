import {DomainTranslations} from '../../services/domain/domain';

type DomainNameSource = {
  id?: number | null;
  translations?: DomainTranslations | Record<string, {name?: string}> | null | undefined;
};

const FALLBACK_LANG_ORDER = ['fr', 'en', 'nl', 'it', 'es'] as const;

/**
 * Canonical "what label should we render for this domain?" helper.
 *
 * Tries the user's current language first, then the canonical
 * FR / EN / NL / IT / ES fallback chain, then any translation that
 * happens to be on the DTO, and finally a numeric ``#id`` placeholder
 * for the genuinely-no-translation edge case (which is i18n-neutral
 * so we don't have to translate the prefix).
 *
 * Replaces the half-dozen near-identical ``getDomainLabel`` /
 * ``localizedDomainName`` implementations that had drifted apart
 * across the page components.
 */
export function getLocalizedDomainName(
  domain: DomainNameSource | null | undefined,
  lang: string | null | undefined,
): string {
  if (!domain) {
    return '';
  }
  const translations = (domain.translations ?? {}) as Record<string, {name?: string} | undefined>;

  const primary = lang ? translations[lang]?.name?.trim() : '';
  if (primary) {
    return primary;
  }

  for (const fallback of FALLBACK_LANG_ORDER) {
    const value = translations[fallback]?.name?.trim();
    if (value) {
      return value;
    }
  }

  for (const entry of Object.values(translations)) {
    const value = entry?.name?.trim();
    if (value) {
      return value;
    }
  }

  return domain.id !== null && domain.id !== undefined ? `#${domain.id}` : '';
}
