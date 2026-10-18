import {SCRUBBED, scrubBreadcrumb, scrubEvent, scrubTokenUrl} from './sentry-scrub';

describe('Sentry token scrubbing (audit M13)', () => {
  it('masks every token-bearing route', () => {
    const cases: [string, string][] = [
      ['https://q.test/auth/magic/abc.def', `https://q.test/auth/magic/${SCRUBBED}`],
      ['/user/reset-password/MQ/tok-123?x=1', `/user/reset-password/${SCRUBBED}?x=1`],
      ['/user/confirm-email/MQ/tok', `/user/confirm-email/${SCRUBBED}`],
      ['/invite/accept/abc', `/invite/accept/${SCRUBBED}`],
      ['/transfer/accept/abc#top', `/transfer/accept/${SCRUBBED}#top`],
      ['/course-invite/abc', `/course-invite/${SCRUBBED}`],
      ['/api/v1/domain/transfer/accept/abc/', `/api/v1/domain/transfer/accept/${SCRUBBED}/`],
    ];
    for (const [input, expected] of cases) {
      expect(scrubTokenUrl(input)).toBe(expected);
    }
  });

  it('leaves other URLs and non-strings alone', () => {
    expect(scrubTokenUrl('/course/12/edit')).toBe('/course/12/edit');
    expect(scrubTokenUrl(42)).toBe(42);
  });

  it('scrubs events and navigation breadcrumbs', () => {
    const event = scrubEvent({
      request: {url: 'https://q.test/auth/magic/secret'},
      transaction: '/auth/magic/secret',
      breadcrumbs: [{data: {from: '/home', to: '/auth/magic/secret'}}],
    });
    expect(JSON.stringify(event)).not.toContain('secret');
    const crumb = scrubBreadcrumb({data: {url: '/api/v1/domain/invite/accept/secret/'}});
    expect(JSON.stringify(crumb)).not.toContain('secret');
  });
});
