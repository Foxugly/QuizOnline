import {Injectable, inject} from '@angular/core';
import {MessageService} from '@openng/optimus-ui/api';

import {userFacingApiMessage} from '../api/api-errors';

export type AppToastSeverity = 'success' | 'info' | 'warn' | 'error';

export type AppToastMessage = {
  severity?: AppToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
};

/**
 * Façade toast de l'app, adossée au ``MessageService`` de Optimus UI (rendu par le
 * ``<p-toast>`` monté à la racine du shell dans ``app.html``). L'API historique
 * (``add`` / ``addApiError`` / ``clear``) est conservée pour ne pas toucher les
 * ~120 sites d'appel ; Optimus UI gère le cycle de vie (``life``, fermeture) et le
 * thème (accent emerald + dark mode via ``darkModeSelector``). Les sévérités
 * (``success``/``info``/``warn``/``error``) correspondent 1:1 à celles de Optimus UI.
 */
@Injectable({providedIn: 'root'})
export class AppToastService {
  private readonly messageService = inject(MessageService);

  /**
   * Shortcut for the common "operation failed" path: extracts the API
   * ``detail``/``message`` from the error when present and surfaces it under the
   * localised ``fallback`` summary. If the API has nothing useful to say
   * (network drop, generic 500), the toast falls back to the summary alone.
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
    this.messageService.add({
      severity: message.severity ?? 'info',
      summary: message.summary ?? '',
      detail: message.detail ?? '',
      life: message.life ?? 4000,
    });
  }

  clear(): void {
    this.messageService.clear();
  }
}
