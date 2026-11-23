import {describe, expect, it} from 'vitest';

import {pickDefaultLang} from './default-lang';

describe('pickDefaultLang', () => {
  it('prefers the user language when it is allowed', () => {
    expect(pickDefaultLang(['fr', 'en'], 'en')).toBe('en');
  });

  it('falls back to the first allowed language, then to fr', () => {
    expect(pickDefaultLang(['nl', 'en'], 'it')).toBe('nl');
    expect(pickDefaultLang(['nl'], null)).toBe('nl');
    expect(pickDefaultLang([], 'en')).toBe('fr');
  });
});
