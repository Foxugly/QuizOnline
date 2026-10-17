import {getUiText} from '../i18n/ui-text';
import {authErrorMessage} from './auth-errors';

describe('authErrorMessage', () => {
  const fallback = 'fallback';
  // Read lazily: the catalogs are registered by the global test setup.
  let ui: ReturnType<typeof getUiText>;
  beforeEach(() => {
    ui = getUiText('fr');
  });

  it('maps a network error and a 5xx to the generic message', () => {
    expect(authErrorMessage({status: 0}, ui, {fallback})).toBe(ui.authErrors.generic);
    expect(authErrorMessage({status: 502, error: {detail: 'Bad gateway'}}, ui, {fallback})).toBe(ui.authErrors.generic);
  });

  it('maps 429 to the too-many-attempts message', () => {
    expect(authErrorMessage({status: 429, error: {detail: 'Request was throttled.'}}, ui, {fallback}))
      .toBe(ui.authErrors.tooManyAttempts);
  });

  it('maps known application codes', () => {
    expect(authErrorMessage({status: 400, error: {code: 'captcha_failed', detail: 'x'}}, ui, {fallback}))
      .toBe(ui.authErrors.captcha);
    expect(authErrorMessage({status: 401, error: {code: 'email_not_confirmed', detail: 'x'}}, ui, {fallback, credentials: true}))
      .toBe(ui.login.confirmEmailRequired);
  });

  it('never shows a raw backend detail', () => {
    const err = {status: 401, error: {detail: 'No active account found with the given credentials'}};
    expect(authErrorMessage(err, ui, {fallback, credentials: true})).toBe(ui.login.invalidCredentials);
    expect(authErrorMessage({status: 400, error: {detail: 'raw'}}, ui, {fallback})).toBe(fallback);
  });
});
