import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {InputTextModule} from 'primeng/inputtext';
import {TextareaModule} from 'primeng/textarea';

import {MailTestService} from '../../../services/admin/mail-test';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';

@Component({
  selector: 'app-mail-test-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './mail-test.html',
  styleUrl: './mail-test.scss',
})
export class MailTestPage {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly mailTestService = inject(MailTestService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ui = computed(() => getUiText(this.userService.currentLang));
  readonly t = computed(() => this.ui().admin.mailTest);

  readonly submitting = signal(false);
  readonly lastResponse = signal<{emailId: number; recipients: string[]; subject: string} | null>(null);

  readonly form = this.fb.nonNullable.group({
    to: ['', [Validators.required, Validators.email]],
    subject: [''],
    body: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.lastResponse.set(null);

    const payload = this.form.getRawValue();

    this.mailTestService.sendTestEmail(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.lastResponse.set({
            emailId: response.email_id,
            recipients: response.recipients,
            subject: response.subject,
          });
          this.toast.add({
            severity: 'success',
            summary: this.t().successTitle,
            detail: response.detail,
          });
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          logApiError('admin.mail-test.send', err);
          const detail = this.extractErrorDetail(err);
          this.toast.add({
            severity: 'error',
            summary: this.t().errorTitle,
            detail,
          });
        },
      });
  }

  get toControl() {
    return this.form.controls.to;
  }

  private extractErrorDetail(err: unknown): string {
    if (typeof err === 'object' && err && 'error' in err) {
      const error = (err as {error?: unknown}).error;
      if (typeof error === 'object' && error && 'detail' in error && typeof (error as {detail?: unknown}).detail === 'string') {
        return (error as {detail: string}).detail;
      }
      if (typeof error === 'object' && error && 'to' in error) {
        const toError = (error as {to?: unknown}).to;
        if (Array.isArray(toError) && typeof toError[0] === 'string') {
          return toError[0];
        }
      }
    }
    return this.t().errorFallback;
  }
}
