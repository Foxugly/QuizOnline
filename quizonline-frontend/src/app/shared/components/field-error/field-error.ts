import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {AbstractControl} from '@angular/forms';

/**
 * Inline form-field error renderer.
 *
 * Designed to sit underneath an input and show the relevant validation
 * message **as soon as the user leaves the field** (``control.touched``)
 * rather than waiting for the submit. Pairs with Angular Reactive
 * Forms, which already track ``touched`` / ``invalid`` for free —
 * this component just renders the first matching message from the
 * caller's localized errors map.
 *
 * Usage:
 *
 * ```html
 * <input pInputText id="name" formControlName="name" />
 * <app-field-error
 *   [control]="form.controls.name"
 *   [errors]="{required: ui().nameRequired, maxlength: ui().nameTooLong}" />
 * ```
 *
 * Why not a directive? A standalone component keeps the SCSS scoped
 * and makes the JSX-style template legible at the call site. The
 * blur-validation behaviour is free — we only own the rendering.
 */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message(); as msg) {
      <small class="field-error" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
        {{ msg }}
      </small>
    }
  `,
  styles: [`
    :host { display: block; }
    .field-error {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin-top: 0.25rem;
      font-size: 0.78rem;
      color: var(--p-red-500, #e53935);
    }
    .field-error .pi {
      font-size: 0.85rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  control = input.required<AbstractControl>();
  /** Map of ``Validators.<key>`` → localized message. The first
   *  matching error wins, so order entries by priority (required
   *  before format-specific rules). */
  errors = input.required<Record<string, string>>();
  /** Force the error to render before the user has touched the field
   *  — useful right after a submit attempt that flagged invalid
   *  fields the user never visited. Defaults to ``false`` so the
   *  field stays clean during the initial fill. */
  showWhenUntouched = input<boolean>(false);

  /** Resolved error message — ``null`` when the control is pristine /
   *  valid / the caller didn't provide a label for the failing rule. */
  protected readonly message = computed<string | null>(() => {
    const ctrl = this.control();
    if (!ctrl) {
      return null;
    }
    const visible = ctrl.touched || ctrl.dirty || this.showWhenUntouched();
    if (!visible || ctrl.valid) {
      return null;
    }
    const errs = ctrl.errors;
    if (!errs) {
      return null;
    }
    const labels = this.errors();
    for (const key of Object.keys(errs)) {
      const label = labels[key];
      if (label) {
        return label;
      }
    }
    return null;
  });
}
