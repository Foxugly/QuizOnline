from .settings_base import *  # noqa: F403,F401

DEBUG = env("DEBUG", default=True)  # noqa: F405
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=True)  # noqa: F405
LOGGING = DEV_LOGGING  # noqa: F405
