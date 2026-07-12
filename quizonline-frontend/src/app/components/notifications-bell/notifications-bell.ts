import {ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

import {NotificationReadDto} from '../../api/generated/model/notification-read';
import {NotificationService} from '../../services/notification/notification.service';
import {notificationQueryFor, notificationRouteFor} from '../../services/notification/notification-routes';
import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {buildNotificationLine, formatRelativeTime} from '../../shared/i18n/notifications.util';

@Component({
  selector: 'app-notifications-bell',
  imports: [DatePipe, RouterLink, EmptyStateComponent],
  templateUrl: './notifications-bell.html',
  styleUrl: './notifications-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsBellComponent implements OnInit {
  private readonly notif = inject(NotificationService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly ui = inject(UiTextService).ui;
  readonly unread = this.notif.unread;
  readonly open = signal(false);
  readonly rows = signal<NotificationReadDto[]>([]);
  readonly loading = signal(false);

  readonly now = signal<number>(Date.now());

  ngOnInit(): void {
    // Refresh "now" every minute so the relative-time labels in the
    // dropdown stay accurate as long as the popover is open. Cheap,
    // signal-driven, OnPush-friendly.
    const id = window.setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  toggle(event: Event): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.refreshList();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }

  refreshList(): void {
    this.loading.set(true);
    this.notif.list('unread', 1)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({rows: [], total: 0})),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({rows}) => this.rows.set(rows.slice(0, 10)));
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.notif.markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notif.refreshUnread();
        this.rows.set([]);
      });
  }

  onItemClick(row: NotificationReadDto, event: Event): void {
    event.stopPropagation();
    // Mark read (server-side) and close the popover. Navigation is
    // best-effort — if the kind has no contextual route we still mark
    // it read so the badge clears.
    if (!row.read_at) {
      this.notif.markRead(row.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.notif.refreshUnread();
          this.rows.update((current) => current.filter((r) => r.id !== row.id));
        });
    }
    const payload = (row.payload as Record<string, unknown>) ?? {};
    const route = notificationRouteFor(row.kind, payload);
    if (route) {
      this.open.set(false);
      void this.router.navigate(route, {queryParams: notificationQueryFor(row.kind, payload)});
    }
  }

  protected readonly relativeFor = computed(() => {
    const now = this.now();
    return (createdAt: string): string => {
      const ts = Date.parse(createdAt);
      if (!Number.isFinite(ts)) {
        return '';
      }
      return formatRelativeTime(Math.max(0, (now - ts) / 1000), this.ui().notifications.relative);
    };
  });

  protected lineFor(row: NotificationReadDto): string {
    return buildNotificationLine(row.kind, (row.payload as Record<string, unknown>) ?? {}, this.ui().notifications.kindLine);
  }

  protected readonly trackById = (_: number, row: NotificationReadDto) => row.id;
}
