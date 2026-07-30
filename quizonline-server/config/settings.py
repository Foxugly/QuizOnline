import os

profile = os.getenv("DJANGO_ENV", "dev").strip().lower()

if profile == "prod":
    from .settings_prod import *
elif profile == "test":
    from .settings_test import *
else:
    from .settings_dev import *
