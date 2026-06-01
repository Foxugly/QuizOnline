import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {TagModule} from 'primeng/tag';

/** The visual kinds this badge can render. ``active`` / ``published`` are
 *  positive (green); ``draft`` / ``inactive`` are neutral (grey, "not live");
 *  the access-* kinds are informative (how members join). */
export type StatusBadgeKind =
  | 'active'
  | 'inactive'
  | 'published'
  | 'draft'
  | 'access-open'
  | 'access-approval'
  | 'access-invite';

type Severity = 'success' | 'secondary' | 'info' | 'warn';

const SEVERITY: Record<StatusBadgeKind, Severity> = {
  active: 'success',
  inactive: 'secondary',
  published: 'success',
  draft: 'secondary',
  'access-open': 'success',
  'access-approval': 'warn',
  'access-invite': 'info',
};

const ICON: Record<StatusBadgeKind, string> = {
  active: 'pi pi-check-circle',
  inactive: 'pi pi-ban',
  published: 'pi pi-check-circle',
  draft: 'pi pi-file-edit',
  'access-open': 'pi pi-globe',
  'access-approval': 'pi pi-verified',
  'access-invite': 'pi pi-envelope',
};

/**
 * Unified state badge. Replaces bare status icons and ad-hoc ``<p-tag>``
 * usages across lists, page headers and structure rows. The caller supplies
 * the already-localised ``label`` (via ``UiTextService``) and the semantic
 * ``kind``; the component owns the severity + icon mapping so the colour
 * semantics stay consistent everywhere (``inactive`` and ``draft`` are both
 * grey on purpose — "not live"; red is reserved for real errors).
 */
@Component({
  selector: 'app-status-badge',
  imports: [TagModule],
  templateUrl: './status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly kind = input.required<StatusBadgeKind>();
  readonly label = input.required<string>();

  readonly severity = computed<Severity>(() => SEVERITY[this.kind()]);
  readonly icon = computed(() => ICON[this.kind()]);
}
