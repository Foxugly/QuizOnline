import {TURNSTILE_SCRIPT_URL, loadTurnstileScript} from './turnstile';

describe('loadTurnstileScript (audit I8)', () => {
  it('injects the Cloudflare script once, on demand', () => {
    // Inert document: nothing is fetched or executed.
    const doc = document.implementation.createHTMLDocument('t');
    expect(doc.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)).toBeNull();
    loadTurnstileScript(doc);
    loadTurnstileScript(doc);
    expect(doc.querySelectorAll(`script[src="${TURNSTILE_SCRIPT_URL}"]`).length).toBe(1);
  });

  it('is no longer loaded eagerly by index.html', () => {
    expect(document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)).toBeNull();
  });
});
