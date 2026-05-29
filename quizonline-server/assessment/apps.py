from django.apps import AppConfig


class AssessmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "assessment"
    verbose_name = "Assessment"

    def ready(self):
        from .signals import _connect
        _connect()
