import {Directive, effect, HostListener, inject, input} from '@angular/core';

import {AppToastService} from '../toast/app-toast.service';
import {UiTextService} from '../i18n/ui-text.service';

const TOAST_THROTTLE_MS = 2500;

/**
 * Discourage copy/paste, selection, drag and right-click on the host element
 * and any descendant. Useful to nudge participants away from sharing the
 * questions or answers verbatim during a quiz.
 *
 * Usage:
 *   <div [appNoCopy]="!readonly()">…</div>
 *
 * Pass `false` to disable the protection (e.g. during review). The default
 * value is `true`, so `<div appNoCopy>` activates it.
 *
 * Optional inputs:
 *   - `trackFocusLoss` (bool) — log when the user switches tab or window.
 *
 * Notes:
 *   - This is a deterrent, not a security measure: the page source is
 *     still readable in DevTools.
 *   - Toast appearances are throttled (2.5 s) so a long-press doesn't
 *     spam the user with notifications.
 */
@Directive({
  selector: '[appNoCopy]',
  host: {
    '[class.no-copy]': 'enabled()',
    '[style.user-select]': 'enabled() ? "none" : null',
    '[style.-webkit-user-select]': 'enabled() ? "none" : null',
    '[style.-moz-user-select]': 'enabled() ? "none" : null',
    '[style.-ms-user-select]': 'enabled() ? "none" : null',
    '[style.-webkit-touch-callout]': 'enabled() ? "none" : null',
  },
})
export class NoCopyDirective {
  readonly enabled = input<boolean>(true, {alias: 'appNoCopy'});
  readonly trackFocusLoss = input<boolean>(false);

  private readonly toast = inject(AppToastService);
  private readonly editorUi = inject(UiTextService).editor;
  private lastToastAt = 0;

  constructor() {
    // Optional: detect tab/visibility loss while protection is active.
    effect((onCleanup) => {
      if (!this.enabled() || !this.trackFocusLoss() || typeof document === 'undefined') {
        return;
      }
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          console.warn('[no-copy] tab/visibility lost');
        }
      };
      const onBlur = () => console.warn('[no-copy] window lost focus');
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);
      onCleanup(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('blur', onBlur);
      });
    });
  }

  @HostListener('copy', ['$event'])
  onCopy(event: ClipboardEvent): void { this.block(event); }

  @HostListener('cut', ['$event'])
  onCut(event: ClipboardEvent): void { this.block(event); }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void { this.block(event); }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void { this.block(event); }

  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void { this.block(event); }

  @HostListener('selectstart', ['$event'])
  onSelectStart(event: Event): void { this.block(event); }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled()) {
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'c' || key === 'x' || key === 'a') {
      this.block(event);
    }
  }

  private block(event: Event): void {
    if (!this.enabled()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    console.warn('[no-copy] blocked', event.type);
    this.notify();
  }

  private notify(): void {
    const now = Date.now();
    if (now - this.lastToastAt < TOAST_THROTTLE_MS) {
      return;
    }
    this.lastToastAt = now;
    const quiz = this.editorUi().quiz;
    this.toast.add({
      severity: 'warn',
      summary: quiz.noCopyToastSummary,
      detail: quiz.noCopyToastDetail,
      life: 2000,
    });
  }
}
