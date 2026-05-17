from django.apps import AppConfig


class LmsEnrollmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_enrollment"
    verbose_name = "LMS — Enrollment"

    def ready(self):
        pass
