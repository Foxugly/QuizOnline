from django.conf import settings
from django.db import models


class AuditMixin(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True


class ActivatableMixin(models.Model):
    """Shared behaviour for models with a boolean ``active`` flag.

    Declares NO field (each model owns its own ``active`` column with its
    existing options) — only convenience mutators."""

    class Meta:
        abstract = True

    def activate(self):
        self.active = True

    def deactivate(self):
        self.active = False


class PublishableMixin(models.Model):
    """Shared behaviour for models with a boolean ``is_published`` flag.

    Declares NO field. ``publish``/``unpublish`` only flip the flag; models
    that also track ``published_at`` (Course) override both to stamp /
    clear it."""

    class Meta:
        abstract = True

    def publish(self):
        self.is_published = True

    def unpublish(self):
        self.is_published = False
