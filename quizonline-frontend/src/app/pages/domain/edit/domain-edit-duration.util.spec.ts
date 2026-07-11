import {formatDomainEditDuration, type DomainEditDurationCopy} from './domain-edit-duration.util';

describe('formatDomainEditDuration', () => {
  const fr: DomainEditDurationCopy = {
    seconds: '{n} s',
    minutes: '{n} min',
    hoursOnly: '{h} h',
    hoursMinutes: '{h} h {m} min',
    daysOnly: '{d} j',
    daysHours: '{d} j {h} h',
  };

  it('renders seconds under a minute (clamping negatives to 0)', () => {
    expect(formatDomainEditDuration(45, fr)).toBe('45 s');
    expect(formatDomainEditDuration(0, fr)).toBe('0 s');
    expect(formatDomainEditDuration(-10, fr)).toBe('0 s');
  });

  it('renders minutes under an hour', () => {
    expect(formatDomainEditDuration(120, fr)).toBe('2 min');
    expect(formatDomainEditDuration(59 * 60, fr)).toBe('59 min');
  });

  it('renders hours, with leftover minutes only when non-zero', () => {
    expect(formatDomainEditDuration(3600, fr)).toBe('1 h');
    expect(formatDomainEditDuration(3600 + 30 * 60, fr)).toBe('1 h 30 min');
  });

  it('renders days, with leftover hours only when non-zero', () => {
    expect(formatDomainEditDuration(24 * 3600, fr)).toBe('1 j');
    expect(formatDomainEditDuration(24 * 3600 + 5 * 3600, fr)).toBe('1 j 5 h');
  });
});
