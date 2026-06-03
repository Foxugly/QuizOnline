from django.conf import settings
from django.db import models


class ConnectionEvent(models.Model):
    PASSWORD = "password"
    MAGIC_LINK = "magic_link"
    LOGIN_METHOD_CHOICES = [(PASSWORD, "Password"), (MAGIC_LINK, "Magic link")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="connection_events",
    )
    account_email = models.CharField(max_length=254, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    login_method = models.CharField(max_length=20, choices=LOGIN_METHOD_CHOICES, default=PASSWORD)

    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    browser = models.CharField(max_length=120, blank=True)
    os = models.CharField(max_length=120, blank=True)

    # browser-captured
    local_time = models.CharField(max_length=64, blank=True)
    browser_language = models.CharField(max_length=64, blank=True)
    timezone = models.CharField(max_length=64, blank=True)
    screen_width = models.PositiveIntegerField(null=True, blank=True)
    screen_height = models.PositiveIntegerField(null=True, blank=True)
    online = models.BooleanField(null=True, blank=True)

    # geo (MaxMind)
    country = models.CharField(max_length=120, blank=True)
    country_code = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=180, blank=True)
    region = models.CharField(max_length=180, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"], name="connlog_user_created_idx")]

    def __str__(self):
        return f"{self.account_email} @ {self.created_at:%Y-%m-%d %H:%M} ({self.ip})"
