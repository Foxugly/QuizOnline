import {ContentBlock} from './content-block.types';

/**
 * Semantic variant of a ``callout`` ContentBlock. Drives both the
 * left-side border colour in :class:`BlockCard` and the
 * ``<p-selectButton>`` choice exposed by ``callout-block-editor``.
 *
 * Stored in ``block.metadata.variant`` (free-form JSON blob on the
 * Block model — the variant is non-translatable so it doesn't live
 * in ``translations``). Defaults to ``'info'`` when missing or
 * unrecognised, preserving the visual of every callout authored
 * before this picker existed.
 */
export type CalloutVariant = 'info' | 'success' | 'warning' | 'error';

export const CALLOUT_VARIANTS = ['info', 'success', 'warning', 'error'] as const;
export const DEFAULT_CALLOUT_VARIANT: CalloutVariant = 'info';

/** Read the active variant from a ContentBlock, defending against
 *  missing / corrupted ``metadata`` payloads. Any value outside the
 *  whitelist collapses to ``'info'`` so the renderer can hand the
 *  attribute straight to CSS without a guard. */
export function readCalloutVariant(block: ContentBlock): CalloutVariant {
  const raw = block.metadata?.['variant'];
  if (typeof raw === 'string' && (CALLOUT_VARIANTS as ReadonlyArray<string>).includes(raw)) {
    return raw as CalloutVariant;
  }
  return DEFAULT_CALLOUT_VARIANT;
}
