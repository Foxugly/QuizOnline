from django.apps import AppConfig


class AssessmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "assessment"
    verbose_name = "Assessment"

    def ready(self):
        # Wire the lms_assessment signals (Quiz pass propagates to
        # LessonProgress / Certificate eligibility check).
        from . import signals  # noqa: F401
