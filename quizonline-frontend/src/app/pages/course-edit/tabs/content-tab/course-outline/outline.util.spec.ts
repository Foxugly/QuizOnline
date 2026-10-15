import {describe, expect, it} from 'vitest';
import {applyLessonDrop, insertSorted, missingLanguages, titleIn} from './outline.util';

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

describe('applyLessonDrop', () => {
  const sections = [
    {id: 1, order: 0, lessons: [{id: 11, order: 0}, {id: 12, order: 1}]},
    {id: 2, order: 1, lessons: [{id: 21, order: 0}]},
  ] as never[];
  it('moves across sections and renumbers both', () => {
    const out = applyLessonDrop(sections as never, 12, 2, 0) as unknown as {id: number, lessons: {id: number, order: number}[]}[];
    expect(out[0].lessons.map((l) => [l.id, l.order])).toEqual([[11, 0]]);
    expect(out[1].lessons.map((l) => [l.id, l.order])).toEqual([[12, 0], [21, 1]]);
  });
  it('reorders within a section', () => {
    const out = applyLessonDrop(sections as never, 11, 1, 1) as unknown as {lessons: {id: number}[]}[];
    expect(out[0].lessons.map((l) => l.id)).toEqual([12, 11]);
  });
  it('leaves the sections untouched for an unknown lesson', () => {
    expect(applyLessonDrop(sections as never, 999, 2, 0)).toBe(sections);
  });
});
