/**
 * Cloudflare Turnstile (captcha) helper.
 *
 * The public site key is resolved at runtime from
 * ``window.__QUIZONLINE_TURNSTILE_SITE_KEY`` (injected by nginx from SSM
 * /quizonline/prod/TURNSTILE_SITE_KEY) with an inline dev fallback. When the
 * key is empty the captcha is not provisioned: the widget is not rendered and
 * no token is required (the backend is gated on its secret the same way).
 *
 * ``TurnstileController`` encapsulates the explicit-render + retry + reset
 * lifecycle so both the register and reset-password pages stay small.
 *
 * The Cloudflare script is injected on first use (audit I8) instead of
 * from ``index.html``: only the pages that render a widget load the
 * third-party code, and never when the captcha is off.
 */

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-api';

/** Append the Turnstile API ``<script>`` once per page. */
export function loadTurnstileScript(doc: Document = document): void {
  if (doc.getElementById(TURNSTILE_SCRIPT_ID)) return;
  const script = doc.createElement('script');
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = TURNSTILE_SCRIPT_URL;
  script.async = true;
  script.defer = true;
  doc.head.appendChild(script);
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error: string) => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileWindow = typeof globalThis & {
  __QUIZONLINE_TURNSTILE_SITE_KEY?: string;
};

export function resolveTurnstileSiteKey(): string {
  return ((globalThis as TurnstileWindow).__QUIZONLINE_TURNSTILE_SITE_KEY ?? '').trim();
}

export class TurnstileController {
  readonly siteKey = resolveTurnstileSiteKey();
  readonly enabled = this.siteKey.length > 0;

  private widgetId: string | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Render the widget into ``container``, loading the API script on first
   * use. Cloudflare's auto-render only scans the DOM once at script load, so
   * we render explicitly and retry a few times while it downloads.
   */
  render(container: HTMLElement | undefined, attempts = 0): void {
    if (!this.enabled || typeof window === 'undefined') return;
    if (!window.turnstile?.render) {
      if (attempts === 0) loadTurnstileScript();
      if (attempts >= 20) return;
      this.retryTimer = setTimeout(() => this.render(container, attempts + 1), 500);
      return;
    }
    if (!container || this.widgetId !== null) return;
    this.widgetId = window.turnstile.render(container, {sitekey: this.siteKey});
  }

  /** The token Cloudflare wrote into the hidden input, or '' if unsolved. */
  readToken(): string {
    if (typeof document === 'undefined') return '';
    const input = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
    return input?.value ?? '';
  }

  /** Re-arm the widget after a consumed/expired token (e.g. a failed submit). */
  reset(): void {
    if (typeof window === 'undefined' || !window.turnstile?.reset) return;
    if (this.widgetId !== null) {
      window.turnstile.reset(this.widgetId);
    } else {
      window.turnstile.reset();
    }
  }

  destroy(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    if (this.widgetId !== null && window.turnstile?.remove) {
      window.turnstile.remove(this.widgetId);
    }
    this.widgetId = null;
  }
}
