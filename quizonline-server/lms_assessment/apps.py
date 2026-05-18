from django.apps import AppConfig


class LmsAssessmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_assessment"
    verbose_name = "LMS — Assessment"

    def ready(self):
        from .signals import _connect
        _connect()
