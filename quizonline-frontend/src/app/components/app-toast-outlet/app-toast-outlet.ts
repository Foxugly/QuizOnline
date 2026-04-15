import {Component, inject} from '@angular/core';

import {AppToastService} from '../../shared/toast/app-toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
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
      border: 1px solid rgba(148, 163, 184, 0.28);
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
      background: #eff6ff;
      border-left-color: #2563eb;
      color: #1e3a8a;
    }

    .toast--success {
      background: #ecfdf5;
      border-left-color: #16a34a;
      color: #166534;
    }

    .toast--warn {
      background: #fffbeb;
      border-left-color: #d97706;
      color: #92400e;
    }

    .toast--error {
      background: #fef2f2;
      border-left-color: #dc2626;
      color: #991b1b;
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
