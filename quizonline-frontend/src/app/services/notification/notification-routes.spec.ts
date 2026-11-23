import {describe, expect, it} from 'vitest';

import {notificationQueryFor, notificationRouteFor} from './notification-routes';

describe('notificationRouteFor', () => {
  it.each([
    ['domain.join_request.created', {domain_id: 4}, ['/domain', 4, 'edit']],
    ['domain.join_request.created', {}, null],
    ['domain.join_request.decided', {}, ['/preferences']],
    ['domain.join_request.expiry_warning', {domain_id: 4}, ['/preferences']],
    ['domain.invite.received', {domain_id: 4}, ['/domain', 4, 'edit']],
    ['domain.invite.received', {}, ['/preferences']],
    ['domain.transfer.received', {domain_id: 4}, ['/preferences']],
    ['quiz.assignment', {quiz_id: 12}, ['/quiz', 12]],
    ['quiz.result_available', {quiz_id: 12}, ['/quiz', 12]],
    ['quiz.detail_available', {}, null],
    ['quiz.completed', {quiz_id: 12}, ['/quiz', 12]],
    ['quiz.completed', {}, null],
    ['unknown.kind', {quiz_id: 12, domain_id: 4}, null],
  ] as const)('%s with %o routes to %o', (kind, payload, expected) => {
    expect(notificationRouteFor(kind, payload as Record<string, unknown>)).toEqual(expected);
  });

  it('ignores ids that are not finite numbers', () => {
    expect(notificationRouteFor('quiz.assignment', {quiz_id: '12'})).toBeNull();
    expect(notificationRouteFor('quiz.assignment', {quiz_id: Number.NaN})).toBeNull();
    expect(notificationRouteFor('domain.invite.received', {domain_id: Infinity})).toEqual([
      '/preferences',
    ]);
  });

  it('tolerates a missing payload', () => {
    expect(
      notificationRouteFor('quiz.assignment', undefined as unknown as Record<string, unknown>),
    ).toBeNull();
  });
});

describe('notificationQueryFor', () => {
  it.each([
    ['domain.join_request.created', {tab: 'invitations'}],
    ['domain.join_request.decided', {tab: 'domains'}],
    ['domain.join_request.expiry_warning', {tab: 'domains'}],
    ['domain.transfer.received', {tab: 'domains'}],
    ['quiz.assignment', {}],
  ])('%s → %o', (kind, expected) => {
    expect(notificationQueryFor(kind, {})).toEqual(expected);
  });
});
