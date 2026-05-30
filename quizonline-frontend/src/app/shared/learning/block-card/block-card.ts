import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {ContentBlock} from '../content-block.types';
import {RichTextBlockRenderer} from '../block-renderers/rich-text-block-renderer';
import {ImageBlockRenderer} from '../block-renderers/image-block-renderer';
import {VideoBlockRenderer} from '../block-renderers/video-block-renderer';
import {FileBlockRenderer} from '../block-renderers/file-block-renderer';
import {QuizBlockRenderer} from '../block-renderers/quiz-block-renderer';
import {CalloutBlockRenderer} from '../block-renderers/callout-block-renderer';
import {CodeBlockRenderer} from '../block-renderers/code-block-renderer';
import {EmbedBlockRenderer} from '../block-renderers/embed-block-renderer';

/**
 * Shared visual frame for every rendered content block.
 *
 * Renders an ``<article class="block-card">`` with the canonical
 * lesson card decorations (border, radius, padding, shadow, overflow
 * containment) and dispatches to the matching learner-facing renderer
 * based on ``block.block_type``. The ``[id]="block-X"`` anchor lets
 * the side outline scroll-link directly to a card.
 *
 * Used by both ``/lesson/{id}`` (learner) and the preview mode
 * of ``/lesson/{id}/edit`` (author) so the two views are
 * pixel-identical — extracting this as a component means a single
 * source of truth for the card visual and for the ``::ng-deep`` rules
 * that pierce into the individual renderers (callout / quiz / file
 * link / rich-text media containment).
 */
@Component({
  selector: 'app-block-card',
  imports: [
    RichTextBlockRenderer,
    ImageBlockRenderer,
    VideoBlockRenderer,
    FileBlockRenderer,
    QuizBlockRenderer,
    CalloutBlockRenderer,
    CodeBlockRenderer,
    EmbedBlockRenderer,
  ],
  template: `
    <article class="block-card" [attr.data-block-type]="block().block_type" [id]="'block-' + block().id">
      @switch (block().block_type) {
        @case ('rich_text') { <app-block-rich-text [block]="block()" /> }
        @case ('image')     { <app-block-image [block]="block()" /> }
        @case ('video')     { <app-block-video [block]="block()" /> }
        @case ('file')      { <app-block-file [block]="block()" /> }
        @case ('quiz')      { <app-block-quiz [block]="block()" /> }
        @case ('callout')   { <app-block-callout [block]="block()" /> }
        @case ('code')      { <app-block-code [block]="block()" /> }
        @case ('embed')     { <app-block-embed [block]="block()" /> }
      }
    </article>
  `,
  styles: [`
    :host { display: block; }

    /* Every block sits in a uniform frame so the page reads as a
     * stack of cards. Inner block decoration (callout accent, quiz
     * accent border, code background) lives INSIDE the card — the
     * outer frame is what gives the whole lesson its rhythm and
     * prevents content overflow. */
    .block-card {
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 10px;
      background: var(--p-surface-0, #fff);
      padding: 1rem 1.25rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      min-width: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      /* Clears the sticky global topbar (~60 px) plus a small breathing
       * gap. Lower values caused the block's first 40-50 px to land
       * behind the topbar, so the anchor scroll looked like it landed
       * too low (only the bottom of the block visible). */
      scroll-margin-top: 5rem;
    }
    .block-card > * { max-width: 100%; }

    /* Quiz / callout / code carry their own accent stripe — drop the
     * outer card padding so the inner accent reaches the card edge. */
    .block-card[data-block-type="quiz"],
    .block-card[data-block-type="callout"],
    .block-card[data-block-type="code"] {
      padding: 0;
    }

    /* ---------------------------------------------------------------
     * Renderer-emitted classes. The renderers (callout / file / quiz)
     * emit raw HTML with class="callout" / class="file-link" /
     * class="quiz-block*" and rely on this component to style them.
     * Angular emulated view encapsulation scopes plain selectors to
     * the component owning the CSS rule, so the rules below are
     * piped through ::ng-deep to reach the child renderers.
     * ::ng-deep is officially deprecated but still functional in
     * Angular 21 — there is no replacement yet for this pattern of
     * parent-styling-child-component CSS.
     * --------------------------------------------------------------- */
    /* Callouts: white background + a semantic accent stripe on the
     * left edge. The data-variant attribute is emitted by
     * <app-block-callout> and falls back to "info" (blue) when the
     * underlying block has no metadata.variant set — preserving
     * the visual of every callout authored before the picker existed. */
    :host ::ng-deep .callout {
      border-left: 4px solid var(--p-blue-500, #3b82f6);
      background: var(--p-surface-0, #fff);
      padding: 0.75rem 1rem;
      margin: 0;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    :host ::ng-deep .callout[data-variant="success"] {
      border-left-color: var(--p-green-500, #22c55e);
    }
    :host ::ng-deep .callout[data-variant="warning"] {
      border-left-color: var(--p-amber-500, #f59e0b);
    }
    :host ::ng-deep .callout[data-variant="error"] {
      border-left-color: var(--p-red-500, #ef4444);
    }
    :host ::ng-deep .callout p {
      margin: 0.25rem 0 0;
      overflow-wrap: break-word;
    }

    :host ::ng-deep .file-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 6px;
      text-decoration: none;
      color: inherit;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host ::ng-deep .file-link:hover {
      background: var(--p-surface-100, #f3f4f6);
    }

    :host ::ng-deep .quiz-block {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-left: 4px solid var(--p-primary-color, #3b82f6);
      border-radius: 10px;
      background: var(--p-surface-50, #fafafa);
    }
    :host ::ng-deep .quiz-block--unconfigured {
      border-left-color: var(--p-surface-border, #e5e7eb);
    }
    :host ::ng-deep .quiz-block__header {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    :host ::ng-deep .quiz-block__title {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.3;
    }
    :host ::ng-deep .quiz-block__meta {
      margin: 0;
      color: var(--p-text-color-secondary, #6b7280);
      font-size: 0.85rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    :host ::ng-deep .quiz-block__score { align-self: flex-start; }
    :host ::ng-deep .quiz-block__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    :host ::ng-deep .quiz-block__loading {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    :host ::ng-deep .quiz-block__error {
      margin: 0;
      color: var(--p-text-color, #111827);
    }
    :host ::ng-deep .quiz-block__notice {
      margin: 0;
      color: var(--p-text-color-secondary, #6b7280);
      font-style: italic;
    }

    /* Author-supplied rich text — clamp inline media inside the card. */
    :host ::ng-deep .rich-text {
      overflow-wrap: break-word;
    }
    :host ::ng-deep .rich-text img,
    :host ::ng-deep .rich-text video,
    :host ::ng-deep .rich-text iframe {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0.5rem 0;
    }
    :host ::ng-deep .rich-text a { word-break: break-word; }
    :host ::ng-deep .rich-text pre { overflow-x: auto; }

    /* Generic element fallbacks for raw <pre>, <iframe>, <video>,
     * <img> emitted by simpler renderers (code, embed, image). */
    :host ::ng-deep pre {
      background: var(--p-surface-100, #f3f4f6);
      padding: 0.75rem 1rem;
      border-radius: 10px;
      overflow-x: auto;
      margin: 0;
      max-width: 100%;
      white-space: pre;
    }

    :host ::ng-deep .muted {
      color: var(--p-text-color-secondary, #6b7280);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockCard {
  readonly block = input.required<ContentBlock>();
}
