/**
 * Neutralise PrimeNG's static ``autofocus="true"`` attribute on every
 * rendered ``<p-button>`` button.
 *
 * Background — PrimeNG v21's Button template renders the inner
 * ``<button>`` with a literal ``autofocus="true"`` regardless of the
 * ``[autofocus]`` input value. The browser honours ``autofocus`` even
 * on elements inserted after the initial document load: when the
 * currently-focused element is ``<body>`` (no user interaction yet)
 * and a focusable element with ``autofocus`` is attached to the DOM,
 * focus jumps to it. On a typical app page that fires dozens of times
 * as the route's components mount, leaving a stray focus ring on
 * whichever PrimeNG button happens to be the last one inserted (often
 * a deep, narrow widget like the question's "Traduire" button — which
 * a user is then surprised to see highlighted on page load).
 *
 * Setting ``[autofocus]="false"`` on the ``<p-button>`` wrapper has
 * no effect because PrimeNG hard-codes the inner attribute. The only
 * reliable workaround is to scrub the attribute as soon as the
 * ``<button>`` element lands in the DOM — before the browser's
 * autofocus algorithm runs.
 *
 * A ``MutationObserver`` on ``document.body`` does exactly that:
 * watches every subtree insertion, finds matching buttons, removes
 * the attribute, and blurs the element if it was already focused
 * (the observer may fire one microtask after the browser already
 * focused the element).
 */
export function installPrimeNgAutofocusStripper(): void {
  // No-op in non-browser environments (SSR, tests without a DOM).
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return;
  }

  const strip = (root: ParentNode): void => {
    if (!(root instanceof Element)) {
      return;
    }
    // The PrimeNG-rendered button carries ``class="p-button ..."`` AND
    // ``autofocus="true"``. The combination scopes us to the quirk
    // without touching legitimate ``<input autofocus>`` form fields
    // a future page might rely on.
    const targets = root.matches('button.p-button[autofocus]')
      ? [root]
      : Array.from(root.querySelectorAll<HTMLButtonElement>('button.p-button[autofocus]'));
    for (const btn of targets) {
      btn.removeAttribute('autofocus');
      // The MutationObserver fires async — the browser may already
      // have focused this button. Blur it so the focus ring goes
      // away; legitimate Tab / click focus will still work later.
      if (document.activeElement === btn) {
        (btn as HTMLButtonElement).blur();
      }
    }
  };

  // Initial pass for buttons already in the DOM at observer attach time.
  strip(document.body);

  // Watch both ``childList`` (new buttons attached) AND ``attributes``
  // (Angular's [attr.autofocus] binding flips the attribute on an
  // already-present element — that microtask happens after the
  // initial node insertion the observer first saw).
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const node of Array.from(m.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            strip(node as Element);
          }
        }
      } else if (m.type === 'attributes' && m.target instanceof Element) {
        strip(m.target);
      }
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['autofocus'],
  });
}
