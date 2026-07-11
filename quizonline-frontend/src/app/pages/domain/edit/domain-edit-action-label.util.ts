/**
 * Audit-action label lookup extracted from the (now JSON) ``domain-edit``
 * catalog. JSON cannot hold functions, so the per-language dictionary lives
 * in ``domain-edit.i18n.json`` (``audit.actionLabels``) while this pure helper
 * reproduces the legacy ``ACTION_LABELS[action] ?? action`` fallback.
 */

/** Per-language map of audit action code → human label. */
export type ActionLabelsCopy = Record<string, string>;

/**
 * Resolve the localized label for an audit ``action`` code, falling back to
 * the raw code when the dictionary has no entry for it (mirrors the legacy
 * ``ACTION_LABELS[action] ?? action``).
 */
export function labelForAction(action: string, labels: ActionLabelsCopy): string {
  return labels[action] ?? action;
}
