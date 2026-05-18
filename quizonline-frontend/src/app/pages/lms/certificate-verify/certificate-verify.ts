import {ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {CardModule} from 'primeng/card';
import {TagModule} from 'primeng/tag';

import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';

import {getLmsCertificateVerifyUiText} from './certificate-verify.i18n';

/**
 * Payload shape returned by the PUBLIC ``GET /api/lms/verify/{token}/``
 * endpoint (``CertificateVerifySerializer``). The endpoint is anonymous
 * and always returns 200 with ``valid: boolean`` — even when the token
 * is unknown — so we treat HTTP errors as "invalid" too.
 */
interface VerifyPayload {
  valid: boolean;
  certificate_number: string;
  course_title: string;
  user_display_name: string;
  issued_at: string;
  revoked: boolean;
}

@Component({
  selector: 'app-lms-certificate-verify',
  imports: [DatePipe, CardModule, TagModule],
  templateUrl: './certificate-verify.html',
  styleUrl: './certificate-verify.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCertificateVerify implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly enrollment = inject(LmsEnrollmentService);
  protected readonly ui = inject(UiTextService).localized(getLmsCertificateVerifyUiText);

  protected readonly result = signal<VerifyPayload | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const token = params.get('token');
      if (!token) {
        this.loading.set(false);
        this.error.set(true);
        return;
      }
      this.verify(token);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  private verify(token: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.enrollment.verify(token).subscribe({
      next: (response: unknown) => {
        this.result.set(response as VerifyPayload);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('lms.certificate.verify', err);
        this.result.set(null);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
