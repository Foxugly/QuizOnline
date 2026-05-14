import {DestroyRef, Injectable, Signal, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {catchError, finalize} from 'rxjs/operators';

import {TableLazyLoadEvent} from 'primeng/table';

import {DomainAuditLogReadDto} from '../../../api/generated/model/domain-audit-log-read';
import {DomainEditApi} from '../../../services/domain/domain-edit-api';
import {logApiError} from '../../../shared/api/api-errors';

/**
 * Audit-log slice of the /domain/{id}/edit page. Owns its own state,
 * filters, lazy-load handler and remote calls so the main page
 * component stays focused on the config form.
 *
 * Lifecycle:
 *   1. The page injects this controller via its ``providers`` array
 *      (component-scoped) and calls ``bind(domainId)`` once.
 *   2. ``ensureLoaded()`` defers the initial fetch to the first time
 *      the user opens the Audit tab — same behaviour as the prior
 *      ``auditLoaded`` latch.
 *   3. Filter UI handlers and lazy-load go through the controller,
 *      which then triggers ``load(...)``.
 *
 * The controller uses ``takeUntilDestroyed`` with its own DestroyRef,
 * which is scoped to the host component thanks to the page's providers
 * array — leaving the page cancels in-flight audit requests.
 */
@Injectable()
export class DomainEditAuditController {
  private readonly editApi = inject(DomainEditApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<DomainAuditLogReadDto[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = 25;
  readonly filterAction = signal('');
  readonly filterActor = signal('');
  readonly filterSince = signal('');
  readonly filterUntil = signal('');
  readonly filterSinceDate: Signal<Date | null> = computed(() => parseIsoDate(this.filterSince()));
  readonly filterUntilDate: Signal<Date | null> = computed(() => parseIsoDate(this.filterUntil()));
  readonly actions = signal<string[]>([]);

  private domainId: number | null = null;
  private loaded = false;

  bind(domainId: number): void {
    this.domainId = domainId;
  }

  /** Idempotent first-open hook: fetches the action list + first page. */
  ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    this.loadActions();
    this.load({resetPage: true});
  }

  apply(): void {
    this.load({resetPage: true});
  }

  clear(): void {
    this.filterAction.set('');
    this.filterActor.set('');
    this.filterSince.set('');
    this.filterUntil.set('');
    this.load({resetPage: true});
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event?.first ?? 0;
    const rows = event?.rows ?? this.pageSize;
    const nextPage = Math.floor(first / rows) + 1;
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      this.load({resetPage: false});
    }
  }

  onDateChange(field: 'since' | 'until', value: Date | null): void {
    const iso = value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
      : '';
    if (field === 'since') {
      this.filterSince.set(iso);
    } else {
      this.filterUntil.set(iso);
    }
    this.apply();
  }

  private load(opts: {resetPage?: boolean}): void {
    if (this.domainId === null) {
      return;
    }
    if (opts.resetPage) {
      this.page.set(1);
    }
    this.loading.set(true);
    this.editApi.listAudit(this.domainId, {
      page: this.page(),
      action: this.filterAction() || undefined,
      actor: this.filterActor().trim() || undefined,
      since: this.filterSince() || undefined,
      until: this.filterUntil() || undefined,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-audit', err);
          return of({rows: [], total: 0});
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        this.rows.set(result.rows);
        this.total.set(result.total);
      });
  }

  private loadActions(): void {
    if (this.domainId === null) {
      return;
    }
    this.editApi.listAuditActions(this.domainId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-audit-actions', err);
          return of<string[]>([]);
        }),
      )
      .subscribe((actions) => this.actions.set(actions));
  }
}

function parseIsoDate(iso: string): Date | null {
  if (!iso) {
    return null;
  }
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) {
    return null;
  }
  return new Date(y, m - 1, d);
}
