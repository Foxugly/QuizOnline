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

# Database: fleet DB_* 6-var convention on the box-local PostgreSQL (OPERATIONS.md §3.13).
_DB_ENGINE_ALIASES = {
    "postgresql": "django.db.backends.postgresql",
    "postgres": "django.db.backends.postgresql",
    "sqlite3": "django.db.backends.sqlite3",
}
_db_engine = require_env_value("DB_ENGINE")
DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": _DB_ENGINE_ALIASES.get(_db_engine, _db_engine),
        "NAME": require_env_value("DB_NAME"),
        "USER": env("DB_USER", default=""),  # noqa: F405
        "PASSWORD": env("DB_PASSWORD", default=""),  # noqa: F405
        "HOST": env("DB_HOST", default=""),  # noqa: F405
        "PORT": env("DB_PORT", default=""),  # noqa: F405
    }
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=600)  # noqa: F405
# Verify a reused connection is still alive before serving the next
# request from it. Without this Django re-uses a connection that
# PostgreSQL has already closed (idle-timeout, restart, …) and the
# first hit fails with ``InterfaceError`` until the worker restarts.
# Costs one ``SELECT 1`` at connection acquisition, which is cheaper
# than the 30-80 ms a brand-new TCP+TLS+auth handshake would burn.
DATABASES["default"]["CONN_HEALTH_CHECKS"] = env.bool("DB_CONN_HEALTH_CHECKS", default=True)  # noqa: F405

CACHES = {"default": env.cache("CACHE_URL", default="redis://127.0.0.1:6379/2")}  # noqa: F405
PARLER_ENABLE_CACHING = True

if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":  # noqa: F405
    raise RuntimeError("Production EMAIL_BACKEND cannot use the console backend.")

if EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":  # noqa: F405
    EMAIL_HOST_USER = require_env_value("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = require_env_value("EMAIL_HOST_PASSWORD")

if EMAIL_BACKEND == "core.email_backends.microsoft_graph.EmailBackend":  # noqa: F405
    # Canonical GRAPH_* / GRAPH_SENDER first (§3.14), else require the legacy
    # MS_GRAPH_* — so the rename can land before/after the SSM migration.
    MS_GRAPH_TENANT_ID = env("GRAPH_TENANT_ID", default="") or require_env_value("MS_GRAPH_TENANT_ID")  # noqa: F405
    MS_GRAPH_CLIENT_ID = env("GRAPH_CLIENT_ID", default="") or require_env_value("MS_GRAPH_CLIENT_ID")  # noqa: F405
    MS_GRAPH_CLIENT_SECRET = env("GRAPH_CLIENT_SECRET", default="") or require_env_value("MS_GRAPH_CLIENT_SECRET")  # noqa: F405
    MS_GRAPH_SENDER_USER_ID = env("GRAPH_SENDER", default="") or require_env_value("MS_GRAPH_SENDER_USER_ID")  # noqa: F405

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
# default-src 'self'; frame-src https://www.youtube.com; img-src 'self' data:;
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])  # noqa: F405
LOGGING = PROD_LOGGING  # noqa: F405

# Error monitoring — Sentry-protocol ingest. Opt-in: set ``SENTRY_DSN``
# to enable. When the DSN is unset, the SDK never initialises so a
# forgotten / unconfigured endpoint is harmless.
#
# The DSN can point at any Sentry-compatible ingest:
#   - Sentry (sentry.io) — Developer plan is free up to 5k errors/month.
#   - GlitchTip Cloud (app.glitchtip.com) — open-source, free tier
#     1k events/month, fully Sentry-SDK compatible.
#   - Self-hosted GlitchTip — single docker-compose, no recurring cost.
SENTRY_DSN = env("SENTRY_DSN", default="").strip()  # noqa: F405
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    from .sentry_filters import drop_redis_loading_noise

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT", default="production"),  # noqa: F405
        release=env("SENTRY_RELEASE", default=""),  # noqa: F405
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            # ``INFO`` adds breadcrumbs from our structured logs;
            # ``ERROR`` events get auto-captured as their own issues.
            LoggingIntegration(level=None, event_level="ERROR"),
        ],
        # Drop known-transient Kombu reconnect noise emitted while Redis
        # reloads its dump (e.g. after needrestart triggers a restart on
        # ``unattended-upgrades``). The Celery worker auto-recovers.
        before_send=drop_redis_loading_noise,
        # Conservative defaults — tune via env without redeploy. Defaults
        # to performance traces off (sentry tier cost) and full PII off
        # (GDPR safer; opt in via SENTRY_SEND_DEFAULT_PII=true once a
        # processor is in place to scrub emails / tokens).
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),  # noqa: F405
        profiles_sample_rate=env.float("SENTRY_PROFILES_SAMPLE_RATE", default=0.0),  # noqa: F405
        send_default_pii=env.bool("SENTRY_SEND_DEFAULT_PII", default=False),  # noqa: F405
    )
