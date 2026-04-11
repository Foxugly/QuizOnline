from .settings_base import *  # noqa: F403,F401

DEBUG = env("DEBUG", default=False)  # noqa: F405
if DEBUG:
    raise RuntimeError("Production settings cannot run with DEBUG=True.")


def require_env_value(name: str) -> str:
    value = env(name, default="").strip()  # noqa: F405
    if not value:
        raise RuntimeError(f"Missing required production setting: {name}")
    return value


SECRET_KEY = require_env_value("SECRET_KEY")
_jwt_signing_key_prod = require_env_value("JWT_SIGNING_KEY")
JWT_SIGNING_KEY = _jwt_signing_key_prod
SIMPLE_JWT["SIGNING_KEY"] = JWT_SIGNING_KEY  # noqa: F405

if JWT_SIGNING_KEY == SECRET_KEY:
    raise RuntimeError("Production JWT_SIGNING_KEY must be different from SECRET_KEY.")

FRONTEND_BASE_URL = require_env_value("FRONTEND_BASE_URL")
DEFAULT_FROM_EMAIL = require_env_value("DEFAULT_FROM_EMAIL")
CELERY_BROKER_URL = require_env_value("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = require_env_value("CELERY_RESULT_BACKEND")

if SECRET_KEY == "django-insecure-dev-key-change-me":
    raise RuntimeError("Production SECRET_KEY must not use the development default.")

if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["*"]:  # noqa: F405
    raise RuntimeError("Production ALLOWED_HOSTS must be explicitly configured.")

DATABASE_URL = require_env_value("DATABASE_URL")
DATABASES = {"default": env.db("DATABASE_URL")}  # noqa: F405
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=600)  # noqa: F405

CACHES = {"default": env.cache("CACHE_URL", default="redis://127.0.0.1:6379/2")}  # noqa: F405
PARLER_ENABLE_CACHING = True

if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":  # noqa: F405
    raise RuntimeError("Production EMAIL_BACKEND cannot use the console backend.")

if EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":  # noqa: F405
    EMAIL_HOST_USER = require_env_value("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = require_env_value("EMAIL_HOST_PASSWORD")

if CELERY_TASK_ALWAYS_EAGER:  # noqa: F405
    raise RuntimeError("Production Celery must not run with CELERY_TASK_ALWAYS_EAGER=True.")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)  # noqa: F405
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)  # noqa: F405
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
# Content-Security-Policy should be enforced by django-csp or the reverse proxy.
# Example:
# default-src 'self'; frame-src https://www.youtube-nocookie.com; img-src 'self' data:;
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])  # noqa: F405
LOGGING = PROD_LOGGING  # noqa: F405
