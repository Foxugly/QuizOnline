import {ChangeDetectionStrategy, Component, DestroyRef, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {fromEvent} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {TooltipModule} from 'primeng/tooltip';

import {UiTextService} from '../../i18n/ui-text.service';
import {logApiError} from '../../api/api-errors';
import {getFullscreenButtonUiText} from './fullscreen-button.i18n';

/**
 * Reusable fullscreen toggle. Takes the whole document in/out of the
 * browser Fullscreen API. The icon + tooltip flip between the enter and
 * exit states, driven by the ``fullscreenchange`` event so the state stays
 * correct even when the user leaves fullscreen via Esc. Drop it anywhere a
 * distraction-free reading/exam view is useful (lesson reader, quiz taking).
 */
@Component({
  selector: 'app-fullscreen-button',
  imports: [ButtonModule, TooltipModule],
  template: `
    <p-button
      type="button"
      severity="secondary"
      [outlined]="true"
      [icon]="isFullscreen() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
      (onClick)="toggle()"
      [pTooltip]="isFullscreen() ? ui().exit : ui().enter"
      tooltipPosition="bottom"
      [attr.aria-label]="isFullscreen() ? ui().exit : ui().enter" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullscreenButton {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getFullscreenButtonUiText);
  protected readonly isFullscreen = signal(false);

  constructor() {
    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFullscreen.set(document.fullscreenElement != null));
  }

  protected toggle(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      document.documentElement
        .requestFullscreen()
        .catch((err: unknown) => logApiError('fullscreen-button.request', err));
    }
  }
}
