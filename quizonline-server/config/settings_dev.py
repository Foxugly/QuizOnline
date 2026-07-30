from .settings_base import *

DEBUG = env("DEBUG", default=True)
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=True)
LOGGING = DEV_LOGGING
