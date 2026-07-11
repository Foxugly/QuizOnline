import {interp} from '../../../shared/i18n/format';

/**
 * Copy templates for {@link formatDomainEditDuration}. Each language owns its
 * own unit wording (``h`` vs ``u``, ``d`` vs ``j`` vs ``g``), so the strings
 * live in the JSON catalog (``analytics.durationFormat``) while the branching
 * logic lives here. Placeholders: ``{n}`` (seconds or minutes), ``{h}`` hours,
 * ``{m}`` leftover minutes, ``{d}`` days.
 */
export interface DomainEditDurationCopy {
  /** Sub-minute total, e.g. ``"{n} s"``. */
  seconds: string;
  /** Sub-hour total, e.g. ``"{n} min"``. */
  minutes: string;
  /** Whole-hour total (no leftover minutes), e.g. ``"{h} h"``. */
  hoursOnly: string;
  /** Hours + leftover minutes, e.g. ``"{h} h {m} min"``. */
  hoursMinutes: string;
  /** Whole-day total (no leftover hours), e.g. ``"{d} d"``. */
  daysOnly: string;
  /** Days + leftover hours, e.g. ``"{d} d {h} h"``. */
  daysHours: string;
}

/**
 * Format an elapsed duration (in seconds) as a localized label, reproducing
 * the legacy thresholds exactly: ``<60s`` → seconds, ``<60min`` → minutes,
 * ``<24h`` → hours (+ leftover minutes when non-zero), else days (+ leftover
 * hours when non-zero). Negative inputs are clamped to 0.
 */
export function formatDomainEditDuration(totalSeconds: number, copy: DomainEditDurationCopy): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) {
    return interp(copy.seconds, {n: s});
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return interp(copy.minutes, {n: m});
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) {
    return remM ? interp(copy.hoursMinutes, {h, m: remM}) : interp(copy.hoursOnly, {h});
  }
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH ? interp(copy.daysHours, {d, h: remH}) : interp(copy.daysOnly, {d});
}
