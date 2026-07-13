import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {TopMenuComponent} from '../topmenu/topmenu';
import {FooterComponent} from '../footer/footer';
import {UiTextService} from '../../../shared/i18n/ui-text.service';

/**
 * Public shell (fleet standard): skip-link, topmenu in `public` mode, the
 * focusable `<main id="main-content">` content outlet and the footer, in a flex
 * column that keeps the footer at the bottom. Wraps the anonymously-reachable
 * routes (marketing, auth, token-landing pages). The topmenu still adapts its
 * nav to the session — a signed-in visitor on a public page keeps the app nav —
 * so `[mode]="'public'"` only selects the anonymous branch. Global chrome
 * (backend-down banner, `<p-toast>`) stays on `app-root`; shared shell styling
 * lives in `src/styles/_shell.scss`.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, TopMenuComponent, FooterComponent],
  templateUrl: './public-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayoutComponent {
  readonly ui = inject(UiTextService).ui;
}
