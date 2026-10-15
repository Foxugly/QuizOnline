import {describe, expect, it} from 'vitest';
import {insertSorted, missingLanguages, titleIn} from './outline.util';

describe('outline utils', () => {
  it('lists languages whose title is empty', () => {
    expect(missingLanguages({fr: {title: 'A'}, en: {title: ' '}}, ['fr', 'en', 'nl'])).toEqual(['en', 'nl']);
  });
  it('inserts by order', () => {
    expect(insertSorted([{order: 0}, {order: 2}], {order: 1}).map((x) => x.order)).toEqual([0, 1, 2]);
  });
  it('falls back to any title', () => {
    expect(titleIn({en: {title: 'Hello'}}, 'fr')).toBe('Hello');
  });
});
