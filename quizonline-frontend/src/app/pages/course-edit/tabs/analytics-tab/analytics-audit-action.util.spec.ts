import {auditActionLabel, type AuditActionLabels} from './analytics-audit-action.util';

describe('auditActionLabel', () => {
  const labels: AuditActionLabels = {
    'course.publish': 'Published',
    'course.unpublish': 'Unpublished',
    'course.clone': 'Cloned',
  };

  it('maps a known action code to its label', () => {
    expect(auditActionLabel('course.publish', labels)).toBe('Published');
    expect(auditActionLabel('course.clone', labels)).toBe('Cloned');
  });

  it('falls back to the raw code for an unknown action', () => {
    expect(auditActionLabel('course.archive', labels)).toBe('course.archive');
  });
});
