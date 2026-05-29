/**
 * Replace ASCII hyphens between two letters with a non-breaking hyphen
 * (U+2011), so compound words like "water-polo" or "rendez-vous" stay on
 * one line when they happen to land at the end of a line. Browsers treat
 * a regular "-" as a soft-wrap opportunity and there is no CSS property
 * to disable that behaviour selectively.
 *
 * Two flavours:
 *
 *  - ``nonBreakingHyphensInHtml`` walks the text nodes of an HTML
 *    fragment via ``DOMParser`` (no ``innerHTML`` setter, no script
 *    execution) so attribute values (``class="my-class"``,
 *    ``href="..."``) and the contents of ``<code>`` / ``<pre>`` /
 *    ``<kbd>`` are left untouched.
 *  - ``nonBreakingHyphensInText`` operates on a plain string for
 *    interpolated text (callout body, titles, etc.).
 */

const HYPHEN_BETWEEN_LETTERS = /(?<=\p{L})-(?=\p{L})/gu;
const PRESERVE_TAGS = new Set(['CODE', 'PRE', 'KBD']);

export function nonBreakingHyphensInText(value: string): string {
  if (!value) return value;
  return value.replace(HYPHEN_BETWEEN_LETTERS, '‑');
}

export function nonBreakingHyphensInHtml(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (let p = node.parentElement; p; p = p.parentElement) {
        if (PRESERVE_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue) {
      node.nodeValue = node.nodeValue.replace(HYPHEN_BETWEEN_LETTERS, '‑');
    }
    node = walker.nextNode();
  }
  return doc.body.innerHTML;
}
