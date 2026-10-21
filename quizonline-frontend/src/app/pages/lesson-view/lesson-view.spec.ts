import {HttpErrorResponse} from '@angular/common/http';

import {enrollmentRequiredGate} from './lesson-view';

describe('enrollmentRequiredGate', () => {
  it('reads the course slug from a 403 enrollment_required body', () => {
    const err = new HttpErrorResponse({
      status: 403,
      error: {detail: 'x', code: 'enrollment_required', course_slug: 'intro'},
    });
    expect(enrollmentRequiredGate(err)).toEqual({courseSlug: 'intro'});
  });

  it('falls back to a null slug when the body has none', () => {
    const err = new HttpErrorResponse({status: 403, error: {code: 'enrollment_required'}});
    expect(enrollmentRequiredGate(err)).toEqual({courseSlug: null});
  });

  it('ignores any other error', () => {
    expect(enrollmentRequiredGate(new HttpErrorResponse({status: 403, error: {detail: 'no'}}))).toBeNull();
    expect(enrollmentRequiredGate(new HttpErrorResponse({status: 404}))).toBeNull();
    expect(enrollmentRequiredGate(new Error('boom'))).toBeNull();
  });
});
