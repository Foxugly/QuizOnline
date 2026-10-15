import {inject} from '@angular/core';
import {CanDeactivateFn, Router} from '@angular/router';

import {UiTextService} from '../../shared/i18n/ui-text.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Navigation ``state`` flag for in-app navigations that must not prompt
 * (e.g. clearing ``?lesson=`` after a confirmed lesson deletion).
 */
export const SKIP_UNSAVED_GUARD = 'skipUnsavedGuard';

/**
 * Asks before leaving a page that still has blocks in edit mode. The course
 * editor route sets ``runGuardsAndResolvers: 'paramsOrQueryParamsChange'``,
 * so this also runs on ``?tab=`` / ``?lesson=`` changes — in-app clicks and
 * browser back / forward alike. It is the single place that prompts.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges() || navigationSkipsGuard()) {
    return true;
  }
  return confirmDiscardUnsaved(unsavedMessage());
};

/** Asks whether unsaved block edits may be discarded (``window.confirm``). */
export function confirmDiscardUnsaved(message: string): boolean {
  return window.confirm(message);
}

function navigationSkipsGuard(): boolean {
  try {
    return inject(Router).currentNavigation()?.extras.state?.[SKIP_UNSAVED_GUARD] === true;
  } catch {
    return false;
  }
}

function unsavedMessage(): string {
  try {
    return inject(UiTextService).editor().common.unsavedChangesConfirm;
  } catch {
    return 'Unsaved changes will be lost. Continue?';
  }
}
