import {interp} from '../../shared/i18n/format';

/**
 * Copy templates for {@link formatCatalogDuration}. Each language owns
 * its own unit wording / spacing (``"{h} h"`` vs ``"{h}h"``, ``min`` vs
 * ``u``), so the strings live in the JSON catalog while the branching
 * logic lives here.
 */
export interface CatalogDurationCopy {
  /** Sub-hour total, e.g. ``"{m} min"``. */
  minutesOnly: string;
  /** Whole-hour total (no leftover minutes), e.g. ``"{h} h"``. */
  hoursOnly: string;
  /** Hours + leftover minutes, e.g. ``"{h} h {m} min"``. */
  hoursMinutes: string;
}

/**
 * Format a course's total duration (in minutes) as a localized label.
 * Reproduces the legacy inline formatter exactly: under 60 minutes →
 * minutes only; 60+ → whole hours, plus the leftover minutes when the
 * remainder is non-zero.
 */
export function formatCatalogDuration(minutes: number, copy: CatalogDurationCopy): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0
      ? interp(copy.hoursMinutes, {h: hours, m: rem})
      : interp(copy.hoursOnly, {h: hours});
  }
  return interp(copy.minutesOnly, {m: minutes});
}
