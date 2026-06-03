import {CommonModule} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import * as L from 'leaflet';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {DatePickerModule} from 'primeng/datepicker';
import {DialogModule} from 'primeng/dialog';
import {TableModule} from 'primeng/table';

import {ConnectionEventReadDto} from '../../../api/generated/model/connection-event-read';
import {PaginatedConnectionEventReadListDto} from '../../../api/generated/model/paginated-connection-event-read-list';
import {ConnectionLogService} from '../../../services/connection-log/connection-log.service';
import {logApiError} from '../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../shared/components/empty-state/empty-state';
import {RelativeDatePipe} from '../../../shared/pipes/relative-date.pipe';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getConnectionsUiText} from './connections.i18n';

/**
 * Superuser-only admin page that lists every recorded login (device +
 * geolocation context), filterable by date range, with a per-row details
 * popup exposing the full event. The Leaflet map lands in Phase E.
 */
@Component({
  selector: 'app-connections',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DatePickerModule,
    DialogModule,
    TableModule,
    EmptyStateComponent,
    RelativeDatePipe,
  ],
  templateUrl: './connections.html',
  styleUrl: './connections.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionsPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly connectionLog = inject(ConnectionLogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = inject(UiTextService).localized(getConnectionsUiText);

  /** Selected date range — ``[start, end]`` while picking, possibly with a
   *  null end mid-selection. Null while the picker is empty. */
  readonly range = signal<Date[] | null>(null);
  readonly events = signal<ConnectionEventReadDto[]>([]);
  readonly loading = signal(false);
  readonly selected = signal<ConnectionEventReadDto | null>(null);

  readonly rows = 25;

  private readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('map');
  private map: L.Map | null = null;
  private markers: L.LayerGroup | null = null;

  constructor() {
    // Whenever the event list (or the localized labels) change, re-render the
    // markers. The map itself is created in ngAfterViewInit; the effect short-
    // circuits until then.
    effect(() => {
      const events = this.events();
      const labels = this.t();
      this.renderMarkers(events, labels.map);
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.initMap();
    // The view is ready now — render whatever events have already loaded.
    this.renderMarkers(this.events(), this.t().map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.markers = null;
  }

  /** Create the Leaflet map + OSM tile layer once the ``#map`` div exists. */
  private initMap(): void {
    const el = this.mapEl()?.nativeElement;
    if (!el || this.map) {
      return;
    }

    // Leaflet's default marker images are referenced relative to the bundled
    // CSS, which 404s under the Angular bundler. The leaflet image assets are
    // copied to /leaflet (see angular.json `assets`); point the default icon
    // at those served URLs so the markers actually render.
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'leaflet/marker-icon-2x.png',
      iconUrl: 'leaflet/marker-icon.png',
      shadowUrl: 'leaflet/marker-shadow.png',
    });

    this.map = L.map(el, {worldCopyJump: true}).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
  }

  /** Clear existing markers and drop one per event that carries a lat/lng. */
  private renderMarkers(
    events: ConnectionEventReadDto[],
    labels: {popupCity: string; popupDate: string},
  ): void {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();

    const points: L.LatLngTuple[] = [];
    for (const event of events) {
      if (event.latitude == null || event.longitude == null) {
        continue;
      }
      const point: L.LatLngTuple = [event.latitude, event.longitude];
      points.push(point);
      const date = event.created_at ? new Date(event.created_at).toLocaleString() : '';
      const popup = [
        this.escapeHtml(event.account_email ?? ''),
        event.city ? `${this.escapeHtml(labels.popupCity)}: ${this.escapeHtml(event.city)}` : '',
        date ? `${this.escapeHtml(labels.popupDate)}: ${this.escapeHtml(date)}` : '',
      ]
        .filter((line) => !!line)
        .join('<br>');
      L.marker(point).bindPopup(popup).addTo(this.markers);
    }

    if (points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points), {padding: [40, 40], maxZoom: 12});
    } else {
      this.map.setView([20, 0], 2);
    }
  }

  /** Minimal HTML escaping for values interpolated into a Leaflet popup. */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  onRangeChange(value: Date[] | null): void {
    this.range.set(value);
    // Only refetch once both ends of the range are picked (or the range
    // was cleared) — avoids a throwaway request on the first click.
    if (!value || (value[0] && value[1])) {
      this.load();
    }
  }

  clearRange(): void {
    this.range.set(null);
    this.load();
  }

  private load(): void {
    const value = this.range();
    const start = value?.[0] ? this.toIsoDate(value[0]) : undefined;
    const end = value?.[1] ? this.toIsoDate(value[1]) : undefined;

    this.loading.set(true);
    this.connectionLog
      .list(start, end)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const page = response as PaginatedConnectionEventReadListDto;
          this.events.set(page?.results ?? []);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('connections.load', err);
          this.events.set([]);
          this.loading.set(false);
        },
      });
  }

  /** Format a Date as ``YYYY-MM-DD`` in local time (the backend filters on
   *  ``created_at__date``). */
  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openDetails(event: ConnectionEventReadDto): void {
    this.selected.set(event);
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.selected.set(null);
    }
  }

  /** Combine a screen width/height into a single "1920 × 1080" label, or
   *  empty when neither is known. */
  screenLabel(event: ConnectionEventReadDto): string {
    if (event.screen_width && event.screen_height) {
      return `${event.screen_width} × ${event.screen_height}`;
    }
    return '';
  }

  /** Combine country + city for the table location column. */
  locationLabel(event: ConnectionEventReadDto): string {
    return [event.city, event.country].filter((part) => !!part).join(', ');
  }

  /** Combine browser + OS for the table device column. */
  deviceLabel(event: ConnectionEventReadDto): string {
    return [event.browser, event.os].filter((part) => !!part).join(' · ');
  }
}
