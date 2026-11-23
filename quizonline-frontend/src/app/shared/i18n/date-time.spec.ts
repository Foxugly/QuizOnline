import {describe, expect, it} from 'vitest';

import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {formatLocalizedDateTime, languageLocale} from './date-time';

describe('date-time', () => {
  it.each([
    [LanguageEnumDto.Fr, 'fr-BE'],
    [LanguageEnumDto.Nl, 'nl-BE'],
    [LanguageEnumDto.It, 'it-IT'],
    [LanguageEnumDto.Es, 'es-ES'],
    [LanguageEnumDto.En, 'en-US'],
    [null, 'en-US'],
  ])('languageLocale(%s) = %s', (lang, locale) => {
    expect(languageLocale(lang)).toBe(locale);
  });

  it('formats a date or ISO string with the language locale', () => {
    const iso = '2026-03-04T05:06:00Z';
    const options: Intl.DateTimeFormatOptions = {year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'};
    expect(formatLocalizedDateTime(iso, LanguageEnumDto.Fr, options)).toBe('04/03/2026');
    expect(formatLocalizedDateTime(new Date(iso), LanguageEnumDto.En, options)).toBe('03/04/2026');
    expect(formatLocalizedDateTime(iso, LanguageEnumDto.En)).toContain('2026');
  });

  it('returns null for empty or invalid input', () => {
    expect(formatLocalizedDateTime(null, LanguageEnumDto.Fr)).toBeNull();
    expect(formatLocalizedDateTime('', LanguageEnumDto.Fr)).toBeNull();
    expect(formatLocalizedDateTime('not a date', LanguageEnumDto.Fr)).toBeNull();
  });
});
