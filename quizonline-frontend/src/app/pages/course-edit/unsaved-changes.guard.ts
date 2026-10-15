import {inject} from '@angular/core';
import {CanDeactivateFn} from '@angular/router';

import {UiTextService} from '../../shared/i18n/ui-text.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page that still has blocks in edit mode. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return confirmDiscardUnsaved(unsavedMessage());
};

/**
 * Asks whether unsaved block edits may be discarded. Event handlers run outside
 * an injection context, so callers pass the already-localized message
 * (``editor().common.unsavedChangesConfirm`` read from a field-injected service).
 */
export function confirmDiscardUnsaved(message: string): boolean {
  return window.confirm(message);
}

function unsavedMessage(): string {
  try {
    return inject(UiTextService).editor().common.unsavedChangesConfirm;
  } catch {
    return 'Unsaved changes will be lost. Continue?';
  }
}
