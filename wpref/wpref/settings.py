import os

profile = os.getenv("DJANGO_ENV", "dev").strip().lower()

if profile == "prod":
    from .settings_prod import *  # noqa: F403,F401
elif profile == "test":
    from .settings_test import *  # noqa: F403,F401
else:
    from .settings_dev import *  # noqa: F403,F401
