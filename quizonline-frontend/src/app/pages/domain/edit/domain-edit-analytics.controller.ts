import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {catchError, finalize} from 'rxjs/operators';

import {DomainAnalyticsDto} from '../../../api/generated/model/domain-analytics';
import {AnalyticsRange, DomainEditApi} from '../../../services/domain/domain-edit-api';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {getDomainEditUiText} from './domain-edit.i18n';
import {UiTextService} from '../../../shared/i18n/ui-text.service';

/**
 * Analytics slice of /domain/{id}/edit. Loads the dashboard data, owns
 * the range selector and the CSV export handler. Page-scoped via the
 * component's ``providers`` array so its DestroyRef cancels in-flight
 * requests when the user navigates away.
 */
@Injectable()
export class DomainEditAnalyticsController {
  private readonly editApi = inject(DomainEditApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly editText = inject(UiTextService).localized(getDomainEditUiText);

  readonly data = signal<DomainAnalyticsDto | null>(null);
  readonly loading = signal(false);
  readonly range = signal<AnalyticsRange>('all');
  readonly exporting = signal(false);

  private domainId: number | null = null;

  bind(domainId: number): void {
    this.domainId = domainId;
  }

  load(): void {
    if (this.domainId === null) {
      return;
    }
    this.loading.set(true);
    this.editApi.getAnalytics(this.domainId, this.range())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-analytics', err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((value) => this.data.set(value));
  }

  onRangeChange(range: AnalyticsRange): void {
    this.range.set(range);
    this.load();
  }

  onExport(): void {
    if (this.exporting() || this.domainId === null) {
      return;
    }
    this.exporting.set(true);
    const range = this.range();
    const id = this.domainId;
    this.editApi.exportAnalyticsCsv(id, range)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.export-analytics', err);
          this.toast.addApiError(err, this.editText().analytics.exportError);
          return of<Blob | null>(null);
        }),
        finalize(() => this.exporting.set(false)),
      )
      .subscribe((blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `domain-${id}-analytics-${range}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  }
}
