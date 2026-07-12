import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {PluralForms} from '../../../../shared/i18n/format';
import data from './enrollment-tab.i18n.json';

/**
 * Per-tab dictionary for the "Enrollment" tab. Surfaces the localized
 * labels for the enrollment table (status filter, column headers,
 * per-row action buttons + confirm dialogs and the empty state) plus
 * the toast strings raised after an approve / reject / cancel
 * round-trip with the backend. The ``invite`` sub-tree carries the
 * matching strings for the course-invite section that surfaces on
 * ``ENROLL_INVITE`` courses. All five languages stay aligned
 * (enforced by ``scripts/check-i18n.ts`` in pre-commit).
 */
export interface CourseEditEnrollmentTabUiText {
  heading: string;
  subtitle: string;

  filters: {
    status: {
      label: string;
      all: string;
    };
  };

  columns: {
    user: string;
    email: string;
    status: string;
    enrolledAt: string;
    completedAt: string;
    actions: string;
  };

  actions: {
    approve: string;
    reject: string;
    cancel: string;
    confirmHeader: string;
    confirmAccept: string;
    confirmReject: string;
    /** INTERP: ``{name}`` — render through ``interp``. */
    confirmApprove: string;
    /** INTERP: ``{name}`` — render through ``interp``. */
    confirmRejectMessage: string;
    /** INTERP: ``{name}`` — render through ``interp``. */
    confirmCancel: string;
  };

  emptyTitle: string;
  emptyMessage: string;
  noCompletedAt: string;

  toasts: {
    approveSuccess: string;
    approveFailed: string;
    rejectSuccess: string;
    rejectFailed: string;
    cancelSuccess: string;
    cancelFailed: string;
    loadFailed: string;
    errorSummary: string;
  };

  invite: {
    heading: string;
    subtitle: string;
    pickerLabel: string;
    pickerPlaceholder: string;
    sendButton: string;
    /** INTERP: ``{n}`` — render through ``interp``. */
    sendBulkButton: string;
    pendingListHeading: string;
    columns: {
      user: string;
      sentAt: string;
      expiresAt: string;
      status: string;
      actions: string;
    };
    statusLabels: {
      pending: string;
      accepted: string;
      declined: string;
      revoked: string;
      expired: string;
    };
    actions: {
      resend: string;
      revoke: string;
      /** INTERP: ``{name}`` — render through ``interp``. */
      confirmResend: string;
      /** INTERP: ``{name}`` — render through ``interp``. */
      confirmRevoke: string;
      resendAll: string;
      /** INTERP: ``{n}`` — render through ``interp``. */
      confirmResendAll: string;
    };
    emptyTitle: string;
    toasts: {
      sendSuccess: string;
      sendFailed: string;
      /** INTERP: ``{processed}``, ``{skipped}`` — render through ``interp``. */
      sendPartialSummary: string;
      resendSuccess: string;
      resendFailed: string;
      revokeSuccess: string;
      revokeFailed: string;
      loadFailed: string;
      /** PLURAL on the resent count — render through ``plural``. */
      resendAllSuccess: PluralForms;
      /** INTERP: ``{processed}``, ``{skipped}`` — render through ``interp``. */
      resendAllPartial: string;
      resendAllFailed: string;
    };
  };
}

const CATALOG = data as Record<string, CourseEditEnrollmentTabUiText>;

export function getCourseEditEnrollmentTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditEnrollmentTabUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
