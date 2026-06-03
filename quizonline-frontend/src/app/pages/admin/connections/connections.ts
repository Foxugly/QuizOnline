import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {CardModule} from 'primeng/card';

import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getConnectionsUiText} from './connections.i18n';

/**
 * Superuser-only admin page that lists every recorded login (device +
 * geolocation context). Phase D scaffold — list, date-range filter and
 * details popup land in Task D2; the map in Phase E.
 */
@Component({
  selector: 'app-connections',
  imports: [CardModule],
  templateUrl: './connections.html',
  styleUrl: './connections.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionsPage {
  protected readonly t = inject(UiTextService).localized(getConnectionsUiText);
}
