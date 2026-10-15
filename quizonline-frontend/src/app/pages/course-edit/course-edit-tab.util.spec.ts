import {describe, expect, it} from 'vitest';
import {parseCourseEditTab} from './course-edit-tab.util';
import {COURSE_EDIT_TAB} from '../../app.routes-paths';

describe('parseCourseEditTab', () => {
  it('accepts known tabs', () => {
    for (const t of ['info', 'content', 'enrollment', 'analytics'] as const) {
      expect(parseCourseEditTab(t)).toBe(t);
    }
  });
  it('maps the legacy "structure" value to content', () => {
    expect(parseCourseEditTab('structure')).toBe('content');
  });
  it('falls back to info', () => {
    expect(parseCourseEditTab(null)).toBe('info');
    expect(parseCourseEditTab('nope')).toBe('info');
  });
});

describe('COURSE_EDIT_TAB', () => {
  it('builds the url', () => {
    expect(COURSE_EDIT_TAB(4, 'content')).toBe('/course/4/edit?tab=content');
    expect(COURSE_EDIT_TAB(4, 'content', 9)).toBe('/course/4/edit?tab=content&lesson=9');
  });
});
