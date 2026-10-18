/**
 * Hosts an embed / video iframe may load — kept equal to the CSP
 * ``frame-src`` that nginx sends (deploy/nginx/quizonline.foxugly.com.conf)
 * and to the backend allow-list (``block/url_policy.py``). A URL outside
 * it would be blocked by the browser anyway; we render the "open in a new
 * tab" link instead of an empty frame, and never hand
 * ``bypassSecurityTrustResourceUrl`` an arbitrary origin (audit M14).
 *
 * Every frame also carries a static ``sandbox`` attribute (Angular refuses
 * to bind it): scripts + same-origin so the players run, popups so "Watch
 * on YouTube" opens, but no top-level navigation and no forms.
 */
const FRAMEABLE_HOSTS = new Set([
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

export function isFrameableUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && FRAMEABLE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
