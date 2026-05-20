from django.contrib import admin
from django.utils import timezone

from .models import Certificate
from .tasks import render_certificate_pdf


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
