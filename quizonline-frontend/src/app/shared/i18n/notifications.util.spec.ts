import {buildNotificationLine, formatRelativeTime, KindLineCopy, RelativeCopy} from './notifications.util';

const relative: RelativeCopy = {
  justNow: 'just now',
  minutesAgo: '{n} min ago',
  hoursAgo: '{n} h ago',
  daysAgo: '{n} d ago',
};

const kind: KindLineCopy = {
  joinRequestCreated: '{ru} requested to join "{dn}".',
  joinRequestApproved: 'Your request on "{dn}" was approved.',
  joinRequestRejected: 'Your request on "{dn}" was rejected.',
  joinRequestExpiry: 'Your request on "{dn}" is about to expire.',
  inviteReceived: '{iu} invited you to join "{dn}".',
  transferReceived: '{ii} is offering you ownership of "{dn}".',
  quizAssignment: 'A new quiz "{title}" has been assigned to you.',
  quizCompleted: '{user} just completed "{title}".',
  quizResult: 'Your score on "{title}" is available.',
  quizDetail: 'The detailed correction of "{title}" is available.',
  defaultUser: 'A user',
  defaultSomeone: 'Someone',
  defaultOwner: 'The owner',
};

describe('formatRelativeTime', () => {
  it('returns "just now" under a minute', () => {
    expect(formatRelativeTime(0, relative)).toBe('just now');
    expect(formatRelativeTime(59, relative)).toBe('just now');
  });

  it('clamps negative seconds to just now', () => {
    expect(formatRelativeTime(-100, relative)).toBe('just now');
  });

  it('renders minutes under an hour', () => {
    expect(formatRelativeTime(60, relative)).toBe('1 min ago');
    expect(formatRelativeTime(59 * 60, relative)).toBe('59 min ago');
  });

  it('renders hours under a day', () => {
    expect(formatRelativeTime(60 * 60, relative)).toBe('1 h ago');
    expect(formatRelativeTime(23 * 3600, relative)).toBe('23 h ago');
  });

  it('renders days beyond 24h', () => {
    expect(formatRelativeTime(24 * 3600, relative)).toBe('1 d ago');
    expect(formatRelativeTime(3 * 24 * 3600, relative)).toBe('3 d ago');
  });
});

describe('buildNotificationLine', () => {
  it('uses the requester username when present', () => {
    expect(buildNotificationLine('domain.join_request.created', {requester_name: 'ada', domain_name: 'Math'}, kind))
      .toBe('ada requested to join "Math".');
  });

  it('falls back to defaultUser when requester is missing', () => {
    expect(buildNotificationLine('domain.join_request.created', {domain_name: 'Math'}, kind))
      .toBe('A user requested to join "Math".');
  });

  it('picks approved vs rejected from the outcome', () => {
    expect(buildNotificationLine('domain.join_request.decided', {outcome: 'approved', domain_name: 'Math'}, kind))
      .toBe('Your request on "Math" was approved.');
    expect(buildNotificationLine('domain.join_request.decided', {outcome: 'rejected', domain_name: 'Math'}, kind))
      .toBe('Your request on "Math" was rejected.');
  });

  it('renders the expiry warning', () => {
    expect(buildNotificationLine('domain.join_request.expiry_warning', {domain_name: 'Math'}, kind))
      .toBe('Your request on "Math" is about to expire.');
  });

  it('falls back to defaultSomeone / defaultOwner for invite and transfer', () => {
    expect(buildNotificationLine('domain.invite.received', {domain_name: 'Math'}, kind))
      .toBe('Someone invited you to join "Math".');
    expect(buildNotificationLine('domain.transfer.received', {domain_name: 'Math'}, kind))
      .toBe('The owner is offering you ownership of "Math".');
  });

  it('renders quiz lines from the template title and acting user', () => {
    expect(buildNotificationLine('quiz.assignment', {template_title: 'Algebra'}, kind))
      .toBe('A new quiz "Algebra" has been assigned to you.');
    expect(buildNotificationLine('quiz.completed', {user_name: 'ada', template_title: 'Algebra'}, kind))
      .toBe('ada just completed "Algebra".');
    expect(buildNotificationLine('quiz.completed', {template_title: 'Algebra'}, kind))
      .toBe('A user just completed "Algebra".');
    expect(buildNotificationLine('quiz.result_available', {template_title: 'Algebra'}, kind))
      .toBe('Your score on "Algebra" is available.');
    expect(buildNotificationLine('quiz.detail_available', {template_title: 'Algebra'}, kind))
      .toBe('The detailed correction of "Algebra" is available.');
  });

  it('returns the raw kind for unknown kinds', () => {
    expect(buildNotificationLine('some.unknown.kind', {}, kind)).toBe('some.unknown.kind');
  });

  it('tolerates a null payload', () => {
    expect(buildNotificationLine('domain.join_request.created', null, kind))
      .toBe('A user requested to join "".');
  });
});
