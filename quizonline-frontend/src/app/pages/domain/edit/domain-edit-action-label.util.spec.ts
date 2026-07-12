import {labelForAction, type ActionLabelsCopy} from './domain-edit-action-label.util';

describe('labelForAction', () => {
  const labels: ActionLabelsCopy = {
    'member.promote': 'Promoted to manager',
    'transfer.accept': 'Ownership transfer accepted',
  };

  it('returns the dictionary label for a known action code', () => {
    expect(labelForAction('member.promote', labels)).toBe('Promoted to manager');
    expect(labelForAction('transfer.accept', labels)).toBe('Ownership transfer accepted');
  });

  it('falls back to the raw code for an unknown action', () => {
    expect(labelForAction('member.unknown_action', labels)).toBe('member.unknown_action');
  });
});
