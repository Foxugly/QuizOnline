import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {TopMenuComponent} from '../topmenu/topmenu';
import {FooterComponent} from '../footer/footer';
import {UiTextService} from '../../../shared/i18n/ui-text.service';

/**
 * Authenticated shell (fleet standard): skip-link, topmenu in `authenticated`
 * mode, the focusable `<main id="main-content">` content outlet and the footer,
 * in a flex column that keeps the footer at the bottom. Wraps the guarded
 * routes via its `<router-outlet>`. Global chrome that must appear once above
 * every layout (the backend-down banner and `<p-toast>`) stays on `app-root`;
 * the shared shell styling lives in `src/styles/_shell.scss`.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, TopMenuComponent, FooterComponent],
  templateUrl: './main-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly ui = inject(UiTextService).ui;
}
