import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {TableModule} from 'primeng/table';

import {LMS_CATALOG, LMS_CERTIFICATE_VIEW} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';

import {getLmsCertificateListUiText} from './certificate-list.i18n';

/**
 * Shape returned by ``GET /api/lms/certificate/`` — see
 * ``CertificateSerializer``. ``course_title`` is not in the standard
 * payload today (only the FK id); it's optional here so the page
 * degrades to a localized "Course #id" placeholder until the backend
 * is extended.
 */
interface CertificateRow {
  id: number;
  course: number;
  course_title?: string | null;
  certificate_number: string;
  issued_at: string;
  pdf_url: string | null;
  revoked_at: string | null;
}

interface CertificateRowVm {
  id: number;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  pdfUrl: string | null;
  viewHref: string;
}

@Component({
  selector: 'app-lms-certificate-list',
  imports: [DatePipe, RouterLink, ButtonModule, TableModule],
  templateUrl: './certificate-list.html',
  styleUrl: './certificate-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCertificateList {
  private readonly enrollment = inject(LmsEnrollmentService);
  protected readonly ui = inject(UiTextService).localized(getLmsCertificateListUiText);

  protected readonly rows = signal<CertificateRow[]>([]);
  protected readonly catalogHref = LMS_CATALOG;

  protected readonly viewRows = computed<CertificateRowVm[]>(() => {
    const fallback = this.ui().courseFallback;
    return this.rows().map((row) => ({
      id: row.id,
      certificateNumber: row.certificate_number,
      courseTitle: row.course_title?.trim() || fallback(row.course),
      issuedAt: row.issued_at,
      pdfUrl: row.pdf_url,
      viewHref: LMS_CERTIFICATE_VIEW(row.id),
    }));
  });

  constructor() {
    this.enrollment.myCertificates().subscribe({
      next: (response: unknown) => {
        const payload = response as {results?: CertificateRow[]} | CertificateRow[] | null;
        if (Array.isArray(payload)) {
          this.rows.set(payload);
        } else {
          this.rows.set(payload?.results ?? []);
        }
      },
      error: (err: unknown) => {
        logApiError('lms.certificate.list', err);
        this.rows.set([]);
      },
    });
  }
}
