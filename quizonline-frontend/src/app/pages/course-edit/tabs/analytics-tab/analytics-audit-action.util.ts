/**
 * Per-language map of raw backend audit-action codes (e.g.
 * ``course.publish``) to their localized display label. Stored in the
 * JSON catalog; resolved through {@link auditActionLabel}.
 */
export type AuditActionLabels = Record<string, string>;

/**
 * Resolve a backend audit-action code to its localized label. Back-end
 * actions are free-form strings, so any code missing from the map falls
 * back to the raw code (unchanged from the legacy inline resolver).
 */
export function auditActionLabel(rawAction: string, labels: AuditActionLabels): string {
  return labels[rawAction] ?? rawAction;
}
