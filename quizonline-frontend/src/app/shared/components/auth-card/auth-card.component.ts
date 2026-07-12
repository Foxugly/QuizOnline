import {ChangeDetectionStrategy, Component, input} from '@angular/core';

/**
 * Shared chrome for the auth pages (login, password reset, email
 * confirmation, …). Reproduces the fleet-standard centred auth card:
 * a tokenised surface box (dark-mode aware) with a centred header made
 * of an optional emerald icon and the page title. Page-specific content
 * is projected below the header via ``<ng-content>``.
 */
@Component({
  selector: 'app-auth-card',
  standalone: true,
  template: `
    <section class="auth-card"><div class="auth-card__box">
      <div class="auth-card__header">
        @if (icon()) { <i [class]="icon()" class="auth-card__icon" aria-hidden="true"></i> }
        <h1 class="auth-card__title">{{ title() }}</h1>
      </div>
      <ng-content />
    </div></section>`,
  styleUrl: './auth-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCardComponent {
  readonly icon = input<string>();
  readonly title = input.required<string>();
}
