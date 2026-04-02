from .settings_base import *  # noqa: F403,F401

DEBUG = False

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

LOGGING = PROD_LOGGING  # noqa: F405
LOGGING["root"]["level"] = "WARNING"
