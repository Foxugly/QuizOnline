import {ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

import {NotificationReadDto} from '../../api/generated/model/notification-read';
import {NotificationService} from '../../services/notification/notification.service';
import {UiTextService} from '../../shared/i18n/ui-text.service';

@Component({
  selector: 'app-notifications-bell',
  imports: [DatePipe, RouterLink],
  templateUrl: './notifications-bell.html',
  styleUrl: './notifications-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsBellComponent implements OnInit {
  private readonly notif = inject(NotificationService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

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
    if (!row.read_at) {
      this.notif.markRead(row.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.notif.refreshUnread();
          this.rows.update((current) => current.filter((r) => r.id !== row.id));
        });
    }
  }

  protected readonly relativeFor = computed(() => {
    const now = this.now();
    return (createdAt: string): string => {
      const ts = Date.parse(createdAt);
      if (!Number.isFinite(ts)) {
        return '';
      }
      return this.ui().notifications.relative(Math.max(0, (now - ts) / 1000));
    };
  });

  protected lineFor(row: NotificationReadDto): string {
    return this.ui().notifications.kindLine(row.kind, (row.payload as Record<string, unknown>) ?? {});
  }

  protected readonly trackById = (_: number, row: NotificationReadDto) => row.id;
}
