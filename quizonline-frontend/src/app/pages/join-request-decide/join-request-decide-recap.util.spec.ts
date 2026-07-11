import {formatRequesterLine, type RequesterLineCopy} from './join-request-decide-recap.util';

describe('formatRequesterLine', () => {
  const copy: RequesterLineCopy = {
    withEmail: 'Requester: {username} ({email})',
    withoutEmail: 'Requester: {username}',
  };

  it('appends the e-mail in parentheses when one is provided', () => {
    expect(formatRequesterLine('alice', 'alice@example.com', copy)).toBe(
      'Requester: alice (alice@example.com)',
    );
  });

  it('omits the parenthesised e-mail when the e-mail is empty', () => {
    expect(formatRequesterLine('alice', '', copy)).toBe('Requester: alice');
  });
});
