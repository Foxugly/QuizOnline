from django.apps import AppConfig


class LmsCatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_catalog"
    verbose_name = "LMS — Catalog"

    def ready(self):
        pass
