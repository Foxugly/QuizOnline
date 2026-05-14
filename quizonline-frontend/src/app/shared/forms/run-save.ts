import {DestroyRef, WritableSignal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize, Observable} from 'rxjs';

import {AppToastService} from '../toast/app-toast.service';

export interface RunSaveOptions<T> {
  /** Caller-side state setters / form patching for the success branch. */
  onSuccess: (value: T) => void;
  /**
   * Toast detail shown to the user when the save succeeds. Omit to skip
   * the success toast — useful for operations that already show their
   * own feedback (e.g. a refreshed dashboard) or that are too quiet to
   * announce.
   */
  successDetail?: string;
  /** Toast detail used as the fallback when the API doesn't return a human message. */
  errorDetail: string;
  /** Set the page's ``lastSavedAt`` indicator on success. Opt-in. */
  bumpSavedAt?: boolean;
  /** Optional hook to capture an error for the page-local error state. */
  onError?: (err: unknown) => void;
}

export interface RunSaveContext {
  /** Page-level "a save is in flight" signal. Toggled true/false by the helper. */
  saving: WritableSignal<boolean>;
  /**
   * Optional "last saved at" indicator signal. Bumped on success when
   * ``RunSaveOptions.bumpSavedAt`` is set — pages without an indicator
   * can omit it.
   */
  lastSavedAt?: WritableSignal<Date | null>;
  destroyRef: DestroyRef;
  toast: AppToastService;
}

/**
 * Shared boilerplate for every "I just mutated something on the server" call.
 *
 * Sets ``saving`` for the duration, hooks ``takeUntilDestroyed`` so leaving
 * the page cancels in-flight requests, shows a success / error toast, and
 * (when ``bumpSavedAt`` is set) bumps the ``Enregistré à HH:MM`` indicator.
 *
 * Callers pass a fully-composed observable — anything that needs a
 * ``switchMap`` to refresh related state should chain it before calling
 * ``runSave``.
 */
export function runSave<T>(
  ctx: RunSaveContext,
  source: Observable<T>,
  options: RunSaveOptions<T>,
): void {
  ctx.saving.set(true);
  source
    .pipe(
      takeUntilDestroyed(ctx.destroyRef),
      finalize(() => ctx.saving.set(false)),
    )
    .subscribe({
      next: (value) => {
        options.onSuccess(value);
        if (options.bumpSavedAt && ctx.lastSavedAt) {
          ctx.lastSavedAt.set(new Date());
        }
        if (options.successDetail) {
          ctx.toast.add({severity: 'success', detail: options.successDetail});
        }
      },
      error: (err) => {
        options.onError?.(err);
        ctx.toast.addApiError(err, options.errorDetail);
      },
    });
}
