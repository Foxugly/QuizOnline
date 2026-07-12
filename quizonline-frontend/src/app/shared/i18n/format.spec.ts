import {interp, plural} from './format';

describe('i18n format helpers', () => {
  describe('interp', () => {
    it('replaces a placeholder with the param value', () => {
      expect(interp('Hello {name}', {name: 'Ada'})).toBe('Hello Ada');
    });

    it('stringifies numeric params', () => {
      expect(interp('{n} pending', {n: 3})).toBe('3 pending');
    });

    it('replaces multiple and repeated placeholders', () => {
      expect(interp('{a} + {a} = {b}', {a: 2, b: 4})).toBe('2 + 2 = 4');
    });

    it('leaves unknown placeholders verbatim', () => {
      expect(interp('Hi {missing}', {})).toBe('Hi {missing}');
    });

    it('returns the template unchanged when there are no placeholders', () => {
      expect(interp('Static text')).toBe('Static text');
    });
  });

  describe('plural', () => {
    const forms = {one: '{n} request', other: '{n} requests'};

    it('uses the singular form for n = 1', () => {
      expect(plural(forms, 1)).toBe('1 request');
    });

    it('uses the singular form for n = 0 (legacy n <= 1 threshold)', () => {
      expect(plural(forms, 0)).toBe('0 request');
    });

    it('uses the plural form for n > 1', () => {
      expect(plural(forms, 5)).toBe('5 requests');
    });

    it('merges extra params alongside n', () => {
      expect(plural({one: '{n} of {total}', other: '{n} of {total}'}, 2, {total: 9})).toBe('2 of 9');
    });
  });
});
