import {formatCatalogDuration, type CatalogDurationCopy} from './catalog-duration.util';

describe('formatCatalogDuration', () => {
  const en: CatalogDurationCopy = {
    minutesOnly: '{m} min',
    hoursOnly: '{h}h',
    hoursMinutes: '{h}h {m}min',
  };
  const fr: CatalogDurationCopy = {
    minutesOnly: '{m} min',
    hoursOnly: '{h} h',
    hoursMinutes: '{h} h {m} min',
  };

  it('renders minutes only under an hour', () => {
    expect(formatCatalogDuration(45, en)).toBe('45 min');
    expect(formatCatalogDuration(0, en)).toBe('0 min');
  });

  it('renders whole hours with no leftover minutes', () => {
    expect(formatCatalogDuration(120, en)).toBe('2h');
    expect(formatCatalogDuration(60, fr)).toBe('1 h');
  });

  it('renders hours plus leftover minutes', () => {
    expect(formatCatalogDuration(90, en)).toBe('1h 30min');
    expect(formatCatalogDuration(90, fr)).toBe('1 h 30 min');
  });
});
