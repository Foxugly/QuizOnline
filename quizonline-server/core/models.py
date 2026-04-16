from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models
from django.db.models import F
from django.utils import timezone


class OutboundEmail(models.Model):
    subject = models.CharField(max_length=255)
    body = models.TextField()
    html_body = models.TextField(blank=True)
    recipients = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    available_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at", "id"]

    def clean(self):
        super().clean()
        if not isinstance(self.recipients, list):
            raise ValidationError({"recipients": "Recipients must be a list of email addresses."})

        errors = []
        for index, recipient in enumerate(self.recipients):
            if not isinstance(recipient, str):
                errors.append(f"Item {index} must be a string.")
                continue
            try:
                validate_email(recipient)
            except ValidationError:
                errors.append(f"Item {index} is not a valid email address.")

        if errors:
            raise ValidationError({"recipients": errors})

    def save(self, *args, **kwargs):
        if not kwargs.get("update_fields"):
            self.full_clean()
        return super().save(*args, **kwargs)

    def mark_attempt(self) -> None:
        type(self).objects.filter(pk=self.pk).update(attempts=F("attempts") + 1)
        self.refresh_from_db(fields=["attempts"])
