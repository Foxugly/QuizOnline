import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {AppToastService} from '../../shared/toast/app-toast.service';

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-live="polite" class="toast-stack">
      @for (message of toast.messages(); track message.id) {
        <article class="toast" [class]="'toast toast--' + message.severity">
          <div class="toast__body">
            @if (message.summary) {
              <strong class="toast__summary">{{ message.summary }}</strong>
            }
            @if (message.detail) {
              <div class="toast__detail">{{ message.detail }}</div>
            }
          </div>
          <button class="toast__close" type="button" (click)="toast.remove(message.id)" aria-label="Fermer">
            ×
          </button>
        </article>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      display: grid;
      gap: 0.75rem;
      pointer-events: none;
      position: fixed;
      right: 1rem;
      top: 1rem;
      width: min(24rem, calc(100vw - 2rem));
      z-index: 1200;
    }

    .toast {
      align-items: start;
      border: 1px solid var(--border);
      border-left-width: 4px;
      border-radius: 1rem;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
      display: grid;
      gap: 0.75rem;
      grid-template-columns: 1fr auto;
      padding: 0.9rem 1rem;
      pointer-events: auto;
    }

    .toast--info {
      background: var(--info-soft);
      border-left-color: var(--info);
      color: var(--info-strong);
    }

    .toast--success {
      background: var(--success-soft);
      border-left-color: var(--success);
      color: var(--success-strong);
    }

    .toast--warn {
      background: var(--warn-soft);
      border-left-color: var(--warn);
      color: var(--warn-strong);
    }

    .toast--error {
      background: var(--danger-soft);
      border-left-color: var(--danger);
      color: var(--danger-strong);
    }

    .toast__body {
      display: grid;
      gap: 0.2rem;
    }

    .toast__summary {
      font-size: 0.95rem;
    }

    .toast__detail {
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .toast__close {
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      opacity: 0.7;
      padding: 0;
    }

    .toast__close:hover {
      opacity: 1;
    }
  `],
})
export class AppToastOutletComponent {
  readonly toast = inject(AppToastService);
}
