from django.contrib import admin
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone

from .models import Certificate, CourseEnrollment, CourseInvite, CourseProgress, LessonProgress
from .services import approve_enrollment
from .tasks import render_certificate_pdf


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "course", "status", "enrolled_at", "completed_at")
    list_filter = ("status", "course__domain")
    search_fields = ("user__email", "user__username", "course__translations__title")
    list_select_related = ("user", "course")
    autocomplete_fields = ("user", "course")
    readonly_fields = ("enrolled_at", "completed_at", "created_by", "updated_by")
    actions = ("approve_selected_action",)

    @admin.action(description="Approve selected pending enrollments")
    def approve_selected_action(self, request, queryset):
        ok, skipped = 0, 0
        for e in queryset.filter(status=CourseEnrollment.STATUS_PENDING):
            try:
                approve_enrollment(enrollment=e, decided_by=request.user)
                ok += 1
            except (ValidationError, PermissionDenied) as exc:
                skipped += 1
                self.message_user(request, f"#{e.id} skipped: {exc}", level="warning")
        self.message_user(request, f"Approved {ok}, skipped {skipped}.")


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "lesson", "is_started", "is_completed", "progress_percent", "last_seen_at")
    list_filter = ("is_completed", "is_started", "lesson__section__course__domain")
    search_fields = ("user__email", "lesson__translations__title")
    list_select_related = ("user", "lesson")
    autocomplete_fields = ("user", "lesson")
    readonly_fields = ("started_at", "completed_at", "last_seen_at")


@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress_percent", "completed_lessons_count", "total_lessons_count", "updated_at")
    list_filter = ("course__domain",)
    list_select_related = ("user", "course")
    readonly_fields = ("updated_at",)


@admin.register(CourseInvite)
class CourseInviteAdmin(admin.ModelAdmin):
    """The inviter is read off ``created_by`` (AuditMixin) — no separate
    ``inviter`` FK any more, so the list/search/select_related set
    points at ``created_by`` instead."""

    list_display = ("id", "course", "invitee", "created_by", "status", "expires_at", "created_at")
    list_filter = ("status", "course__domain")
    search_fields = ("invitee__email", "invitee__username", "course__translations__title")
    list_select_related = ("course", "invitee", "created_by")
    autocomplete_fields = ("course", "invitee", "created_by")
    readonly_fields = (
        "token", "last_sent_at", "accepted_at", "declined_at", "revoked_at",
        "created_at", "updated_at", "created_by", "updated_by",
    )


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_number", "user", "course", "issued_at", "pdf_rendered_at", "revoked_at")
    list_filter = ("course__domain", "revoked_at")
    search_fields = ("certificate_number", "user__email")
    readonly_fields = ("certificate_number", "verification_token", "pdf", "pdf_rendered_at", "issued_at")
    actions = ("regenerate_pdf_action", "revoke_selected_action")

    @admin.action(description="Re-render PDF (Celery)")
    def regenerate_pdf_action(self, request, queryset):
        for cert in queryset:
            render_certificate_pdf.delay(cert.id)
        self.message_user(request, f"{queryset.count()} re-render jobs queued.")

    @admin.action(description="Revoke selected certificates")
    def revoke_selected_action(self, request, queryset):
        queryset.filter(revoked_at__isnull=True).update(
            revoked_at=timezone.now(),
            revoke_reason="Revoked via admin",
        )
