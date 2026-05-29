import {Directive, OnDestroy, input} from '@angular/core';

/**
 * Browser-level unload warning bound to a "dirty" flag the host
 * passes in. Used on edit forms (quiz template, domain, preferences)
 * so an accidental tab close / reload / external navigation prompts
 * the user instead of silently discarding their edits.
 *
 * Usage::
 *
 *     <form [appDirtyGuard]="form.dirty && !saving()">
 *
 * Browsers ignore the custom string in modern versions — what matters
 * is that ``preventDefault`` is called and ``returnValue`` is set.
 * Internal Angular Router navigations are NOT covered here; for those
 * a ``CanDeactivate`` guard would be the right tool (not added yet
 * because the team is fine clicking Cancel/Save on internal nav).
 */
@Directive({
  selector: '[appDirtyGuard]',
})
export class DirtyGuardDirective implements OnDestroy {
  readonly dirty = input.required<boolean>({alias: 'appDirtyGuard'});

  private readonly handler = (event: BeforeUnloadEvent): void => {
    if (!this.dirty()) {
      return;
    }
    event.preventDefault();
    // Required by Chrome / Edge for the prompt to fire; the string
    // itself is ignored — the browser shows its own copy.
    event.returnValue = '';
  };

  constructor() {
    window.addEventListener('beforeunload', this.handler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handler);
  }
}
