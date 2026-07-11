import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {ButtonModule} from 'primeng/button';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TableLazyLoadEvent, TableModule} from 'primeng/table';
import {TooltipModule} from 'primeng/tooltip';

import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {TableSkeleton} from '../../shared/components/loading-skeleton/table-skeleton';

import {Router} from '@angular/router';

import {NotificationReadDto} from '../../api/generated/model/notification-read';
import {NotificationService, NotificationStatusFilter} from '../../services/notification/notification.service';
import {notificationQueryFor, notificationRouteFor} from '../../services/notification/notification-routes';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {buildNotificationLine, formatRelativeTime} from '../../shared/i18n/notifications.util';

@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, FormsModule, ButtonModule, SelectButtonModule, TableModule, TooltipModule, EmptyStateComponent, TableSkeleton],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage implements OnInit {
  private readonly notif = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly ui = inject(UiTextService).ui;
  readonly filter = signal<NotificationStatusFilter>('unread');
  readonly page = signal<number>(1);
  readonly pageSize = 25;
  readonly rows = signal<NotificationReadDto[]>([]);
  readonly total = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly initialLoad = signal<boolean>(true);
  readonly now = signal<number>(Date.now());

  ngOnInit(): void {
    const id = window.setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
    this.load();
  }

  protected readonly filterOptions = computed<Array<{label: string; value: NotificationStatusFilter}>>(() => [
    {label: this.ui().notifications.filterUnread, value: 'unread'},
    {label: this.ui().notifications.filterAll, value: 'all'},
    {label: this.ui().notifications.filterDeleted, value: 'deleted'},
  ]);

  onFilterChange(value: NotificationStatusFilter | null | undefined): void {
    if (!value || value === this.filter()) {
      return;
    }
    this.filter.set(value);
    this.page.set(1);
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event?.first ?? 0;
    const rows = event?.rows ?? this.pageSize;
    const page = Math.floor(first / rows) + 1;
    if (page !== this.page()) {
      this.page.set(page);
      this.load();
    }
  }

  markAllRead(): void {
    this.notif.markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notif.refreshUnread();
        this.load();
      });
  }

  markRead(row: NotificationReadDto): void {
    if (row.read_at) {
      return;
    }
    this.notif.markRead(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notif.refreshUnread();
        this.load();
      });
  }

  /** Click the line itself: marks read + navigates to the contextual
   *  page when the kind has one. */
  openRow(row: NotificationReadDto): void {
    this.markRead(row);
    const payload = (row.payload as Record<string, unknown>) ?? {};
    const route = notificationRouteFor(row.kind, payload);
    if (route) {
      void this.router.navigate(route, {queryParams: notificationQueryFor(row.kind, payload)});
    }
  }

  remove(row: NotificationReadDto): void {
    this.notif.delete(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notif.refreshUnread();
        this.load();
      });
  }

  protected lineFor(row: NotificationReadDto): string {
    return buildNotificationLine(row.kind, (row.payload as Record<string, unknown>) ?? {}, this.ui().notifications.kindLine);
  }

  protected relativeFor(createdAt: string): string {
    const ts = Date.parse(createdAt);
    if (!Number.isFinite(ts)) {
      return '';
    }
    return formatRelativeTime(Math.max(0, (this.now() - ts) / 1000), this.ui().notifications.relative);
  }

  private load(): void {
    this.loading.set(true);
    this.notif.list(this.filter(), this.page())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({rows: [], total: 0})),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({rows, total}) => {
        this.rows.set(rows);
        this.total.set(total);
        this.initialLoad.set(false);
      });
  }
}
