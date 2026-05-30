import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {TagModule} from 'primeng/tag';

import {CERTIFICATE_VERIFY, ME_CERTIFICATES} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {LoadingSkeleton} from '../../shared/components/loading-skeleton/loading-skeleton';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';

import {getCertificateViewUiText} from './certificate-view.i18n';

/**
 * Payload returned by ``GET /api/certificate/{id}/``. The
 * ``CertificateSerializer`` exposes the FK ids, the certificate number,
 * the localized ``course_title`` (slug fallback applied server-side),
 * the issue date, the PDF url, the verification token, and the
 * revocation timestamp.
 */
interface CertificateDetail {
  id: number;
  user: number;
  course: number;
  course_title: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string | null;
  pdf_url: string | null;
  revoked_at: string | null;
  verification_token?: string | null;
}

@Component({
  selector: 'app-certificate-view',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, TagModule, LoadingSkeleton],
  templateUrl: './certificate-view.html',
  styleUrl: './certificate-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateView implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly enrollment = inject(EnrollmentService);
  protected readonly ui = inject(UiTextService).localized(getCertificateViewUiText);

  protected readonly certificate = signal<CertificateDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly listHref = ME_CERTIFICATES;

  protected readonly courseTitle = computed(() => this.certificate()?.course_title ?? '');

  protected readonly verifyUrl = computed(() => {
    const token = this.certificate()?.verification_token;
    if (!token) {
      return null;
    }
    // Public verify page — absolute so the link is shareable.
    return `${window.location.origin}${CERTIFICATE_VERIFY(token)}`;
  });

  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const raw = params.get('id');
      const id = raw ? Number.parseInt(raw, 10) : NaN;
      if (!Number.isFinite(id)) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }
      this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  private load(id: number): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.enrollment.certificate(id).subscribe({
      next: (response: unknown) => {
        this.certificate.set(response as CertificateDetail);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('lms.certificate.view', err);
        this.certificate.set(null);
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
