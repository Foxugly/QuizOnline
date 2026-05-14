import {Injectable, signal} from '@angular/core';

import {userFacingApiMessage} from '../api/api-errors';

export type AppToastSeverity = 'success' | 'info' | 'warn' | 'error';

export type AppToastMessage = {
  severity?: AppToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
};

export type AppToastItem = Required<Pick<AppToastMessage, 'severity' | 'summary' | 'detail'>> & {
  id: number;
  life: number;
};

@Injectable({providedIn: 'root'})
export class AppToastService {
  readonly messages = signal<AppToastItem[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Shortcut for the common "operation failed" path: extracts the
   * API ``detail``/``message`` from the error when present and
   * surfaces it under the localised ``fallback`` summary. If the
   * API has nothing useful to say (network drop, generic 500), the
   * toast falls back to the summary alone — the user is never left
   * with a vague "L'action a échoué." when the backend gave us
   * "Permission refusée pour ce domaine.".
   */
  addApiError(error: unknown, fallback: string): void {
    const detail = userFacingApiMessage(error, '');
    this.add({
      severity: 'error',
      summary: fallback,
      detail: detail && detail !== fallback ? detail : '',
    });
  }

  add(message: AppToastMessage): void {
    const item: AppToastItem = {
      id: this.nextId++,
      severity: message.severity ?? 'info',
      summary: message.summary ?? '',
      detail: message.detail ?? '',
      life: message.life ?? 4000,
    };

    this.messages.update((items) => [...items, item]);

    if (item.life > 0) {
      const timer = setTimeout(() => this.remove(item.id), item.life);
      this.timers.set(item.id, timer);
    }
  }

  remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.messages.set([]);
  }
}
