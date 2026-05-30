import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {ContentBlock} from '../../../shared/learning/content-block.types';

/**
 * Renders the ``code`` ContentBlock as a monospace ``<pre><code>`` block.
 *
 * Syntax highlighting is intentionally out of scope for T59 — the
 * ``data-language`` attribute carries the language tag so a Prism / Shiki
 * pass can be wired later without touching the template.
 */
@Component({
  selector: 'app-block-code',
  template: `
    <pre><code [attr.data-language]="block().code_language">{{ block().code_content }}</code></pre>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockRenderer {
  readonly block = input.required<ContentBlock>();
}
