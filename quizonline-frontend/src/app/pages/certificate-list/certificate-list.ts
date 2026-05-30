import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {TableModule} from 'primeng/table';
import {TooltipModule} from 'primeng/tooltip';

import {CATALOG, CERTIFICATE_VIEW} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {TableSkeleton} from '../../shared/components/loading-skeleton/table-skeleton';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';

import {getCertificateListUiText} from './certificate-list.i18n';

/**
 * Shape returned by ``GET /api/certificate/`` — see
 * ``CertificateSerializer``. ``course_title`` is a localized
 * ``SerializerMethodField`` (slug fallback on the backend), so it is
 * always a non-empty string.
 */
interface CertificateRow {
  id: number;
  course: number;
  course_title: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string | null;
  pdf_url: string | null;
  revoked_at: string | null;
}

interface CertificateRowVm {
  id: number;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  expiresAt: string | null;
  pdfUrl: string | null;
  viewHref: string;
}

@Component({
  selector: 'app-certificate-list',
  imports: [DatePipe, RouterLink, ButtonModule, TableModule, TooltipModule, PageHeader, TableSkeleton],
  templateUrl: './certificate-list.html',
  styleUrl: './certificate-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateList {
  private readonly enrollment = inject(EnrollmentService);
  protected readonly ui = inject(UiTextService).localized(getCertificateListUiText);

  protected readonly rows = signal<CertificateRow[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly catalogHref = CATALOG;

  protected readonly viewRows = computed<CertificateRowVm[]>(() =>
    this.rows().map((row) => ({
      id: row.id,
      certificateNumber: row.certificate_number,
      courseTitle: row.course_title,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      pdfUrl: row.pdf_url,
      viewHref: CERTIFICATE_VIEW(row.id),
    })),
  );

  constructor() {
    this.enrollment.myCertificates().subscribe({
      next: (response: unknown) => {
        const payload = response as {results?: CertificateRow[]} | CertificateRow[] | null;
        if (Array.isArray(payload)) {
          this.rows.set(payload);
        } else {
          this.rows.set(payload?.results ?? []);
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        logApiError('lms.certificate.list', err);
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }
}
