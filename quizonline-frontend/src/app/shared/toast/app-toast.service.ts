import {Injectable, signal} from '@angular/core';

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
      window.setTimeout(() => this.remove(item.id), item.life);
    }
  }

  remove(id: number): void {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.messages.set([]);
  }
}
