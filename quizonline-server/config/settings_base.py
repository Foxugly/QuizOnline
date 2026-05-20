from copy import deepcopy
from datetime import timedelta
from pathlib import Path

import environ
import sentry_sdk
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, "django-insecure-dev-key-change-me"),
    JWT_SIGNING_KEY=(str, ""),
    LMS_COURSE_INVITES_ENABLED=(bool, True),
    LMS_COURSE_INVITE_BULK_MAX=(int, 200),
    LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=(int, 72),
    ALLOWED_HOSTS=(list, ["*"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:4200", "http://127.0.0.1:4200"]),
    DEFAULT_FROM_EMAIL=(str, "no-reply@monapp.com"),
    EMAIL_BACKEND=(str, "django.core.mail.backends.console.EmailBackend"),
    EMAIL_HOST=(str, "smtp.office365.com"),
    EMAIL_PORT=(int, 587),
    EMAIL_HOST_USER=(str, ""),
    EMAIL_HOST_PASSWORD=(str, ""),
    EMAIL_USE_TLS=(bool, True),
    MS_GRAPH_TENANT_ID=(str, ""),
    MS_GRAPH_CLIENT_ID=(str, ""),
    MS_GRAPH_CLIENT_SECRET=(str, ""),
    MS_GRAPH_SENDER_USER_ID=(str, ""),
    FRONTEND_BASE_URL=(str, "http://127.0.0.1:4200"),
    PASSWORD_RESET_FRONTEND_PATH_PREFIX=(str, "/user/reset-password"),
    MEDIA_ROOT_DIR=(str, "media"),
    USE_DEEPL=(bool, False),
    DEEPL_IS_FREE=(bool, False),
    DATABASE_URL=(str, ""),
    CACHE_URL=(str, "locmemcache://"),
    DB_CONN_MAX_AGE=(int, 0),
    CELERY_BROKER_URL=(str, "redis://127.0.0.1:6379/0"),
    CELERY_RESULT_BACKEND=(str, "redis://127.0.0.1:6379/1"),
    CELERY_TASK_ALWAYS_EAGER=(bool, False),
    CELERY_TASK_DEFAULT_QUEUE=(str, "celery"),
    API_PAGE_SIZE=(int, 20),
    QUIZ_ASSIGNMENT_ALERT_CLOSE_IMMEDIATELY=(bool, True),
    QUIZ_ASSIGNMENT_ALERT_REPORTER_REPLY_ALLOWED=(bool, True),
    DATA_UPLOAD_MAX_MEMORY_SIZE=(int, 10 * 1024 * 1024),
    FILE_UPLOAD_MAX_MEMORY_SIZE=(int, 10 * 1024 * 1024),
    MAX_UPLOAD_FILE_SIZE=(int, 10 * 1024 * 1024),
    # Throttle rates: every DRF scope is overridable from the
    # environment so operators can re-tune without a code deploy.
    # Format follows DRF: ``<int>/<period>`` where period is one of
    # ``second / minute / hour / day``.
    THROTTLE_TOKEN_OBTAIN=(str, "5/min"),
    THROTTLE_PASSWORD_RESET=(str, "3/hour"),
    THROTTLE_PASSWORD_RESET_CONFIRM=(str, "10/hour"),
    THROTTLE_EMAIL_CONFIRM=(str, "10/hour"),
    THROTTLE_QUIZ_ANSWER=(str, "60/min"),
    THROTTLE_ADMIN=(str, "30/min"),
    THROTTLE_ADMIN_EMAIL_TEST=(str, "5/min"),
    THROTTLE_QUIZ_EXPORT=(str, "20/min"),
    THROTTLE_DOMAIN_INVITE=(str, "100/hour"),
    THROTTLE_DOMAIN_INVITE_FANOUT=(str, "5/hour"),
    THROTTLE_MAGIC_LINK_REQUEST=(str, "3/hour"),
    THROTTLE_MAGIC_LINK_EXCHANGE=(str, "30/min"),
    THROTTLE_LMS_ENROLL=(str, "20/min"),
    THROTTLE_LMS_INVITE_SEND=(str, "50/min"),
    THROTTLE_LMS_BLOCK_WRITE=(str, "120/min"),
    THROTTLE_LMS_CERT_VERIFY=(str, "60/min"),
    THROTTLE_LMS_ANALYTICS=(str, "60/min"),
    SENTRY_DSN=(str, ""),
    SENTRY_RELEASE=(str, ""),
    SENTRY_ENVIRONMENT=(str, "production"),
    SENTRY_TRACES_SAMPLE_RATE=(float, 0.05),
    SENTRY_PROFILES_SAMPLE_RATE=(float, 0.0),
    # Send IP / user / cookies to the ingest endpoint. The SDK still scrubs
    # known sensitive headers (Authorization, Cookie, CSRF) on its own; what
    # this flag toggles is request-IP, user.id/email when set on the scope,
    # and the URL query string. Default True matches the deployed prod
    # value — operators wanting an extra-conservative posture (e.g. before
    # the privacy policy lists Sentry as a sub-processor) can override
    # SENTRY_SEND_DEFAULT_PII=False in .env.
    SENTRY_SEND_DEFAULT_PII=(bool, True),
)
ENV_FILE = BASE_DIR / ".env"
environ.Env.read_env(str(ENV_FILE))

SECRET_KEY = env("SECRET_KEY")
_jwt_signing_key = env("JWT_SIGNING_KEY")
JWT_SIGNING_KEY = _jwt_signing_key if _jwt_signing_key else SECRET_KEY

SENTRY_DSN = env("SENTRY_DSN")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT"),
        release=env("SENTRY_RELEASE") or None,
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE"),
        profiles_sample_rate=env.float("SENTRY_PROFILES_SAMPLE_RATE"),
        send_default_pii=env.bool("SENTRY_SEND_DEFAULT_PII"),
    )

DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
NAME_APP = "QuizOnline"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core.apps.CoreConfig",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "schema_viewer",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
    "django_extensions",
    "import_export",
    "parler",
    "customuser.apps.CustomuserConfig",
    "subject.apps.SubjectConfig",
    "question.apps.QuestionConfig",
    "quiz.apps.QuizConfig",
    "domain.apps.DomainConfig",
    "language.apps.LanguageConfig",
    "translation.apps.TranslationConfig",
    "course.apps.CourseConfig",
    "lesson.apps.LessonConfig",
    "block.apps.BlockConfig",
    "lms_assessment.apps.LmsAssessmentConfig",
    "lms_enrollment.apps.LmsEnrollmentConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.log_middleware.LogContextMiddleware",
    "config.security_headers.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"
AUTH_USER_MODEL = "customuser.CustomUser"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3")}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE")

CACHES = {"default": env.cache("CACHE_URL")}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGES = (
    ("en", _("English")),
    ("fr", _("French")),
    ("nl", _("Dutch")),
    ("it", _("Italy")),
    ("es", _("Spain")),
)

LANGUAGE_CODE = "en"
TIME_ZONE = "Europe/Brussels"
USE_I18N = True
USE_TZ = True

LOCALE_PATHS = [BASE_DIR / "locale"]

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": env("API_PAGE_SIZE"),
    # Throttle rates are read from the environment with the historical
    # values as fallback defaults — see the ``THROTTLE_*`` entries in
    # the ``env`` constructor above and ``.env.example`` for the
    # operator-facing description of each scope.
    #
    # Notable scopes:
    #   - ``domain_invite``: single-domain invite path, generous because
    #     a single hit sends at most ``len(emails)`` mails (capped at 50).
    #   - ``domain_invite_fanout``: hit with ``additional_domain_ids``
    #     non-empty; one request can fan out to up to 21 domains so the
    #     per-hour budget must be much tighter than ``domain_invite``.
    "DEFAULT_THROTTLE_RATES": {
        "token_obtain": env("THROTTLE_TOKEN_OBTAIN"),
        "password_reset": env("THROTTLE_PASSWORD_RESET"),
        "password_reset_confirm": env("THROTTLE_PASSWORD_RESET_CONFIRM"),
        "email_confirm": env("THROTTLE_EMAIL_CONFIRM"),
        "quiz_answer": env("THROTTLE_QUIZ_ANSWER"),
        "admin": env("THROTTLE_ADMIN"),
        "admin_email_test": env("THROTTLE_ADMIN_EMAIL_TEST"),
        "quiz_export": env("THROTTLE_QUIZ_EXPORT"),
        "domain_invite": env("THROTTLE_DOMAIN_INVITE"),
        "domain_invite_fanout": env("THROTTLE_DOMAIN_INVITE_FANOUT"),
        "magic_link_request": env("THROTTLE_MAGIC_LINK_REQUEST"),
        "magic_link_exchange": env("THROTTLE_MAGIC_LINK_EXCHANGE"),
        "lms_enroll": env("THROTTLE_LMS_ENROLL"),
        "lms_invite_send": env("THROTTLE_LMS_INVITE_SEND"),
        "lms_block_write": env("THROTTLE_LMS_BLOCK_WRITE"),
        "lms_cert_verify": env("THROTTLE_LMS_CERT_VERIFY"),
        "lms_analytics": env("THROTTLE_LMS_ANALYTICS"),
    },
}

# Allow the Playwright fullstack runner (and other test harnesses) to disable
# rate limiting via env var. Several e2e tests legitimately POST /api/token/
# more than 5 times per minute from 127.0.0.1 and would otherwise hit 429.
if env.bool("DISABLE_THROTTLES", default=False):
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
        scope: None for scope in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    }

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": f"{NAME_APP} API",
    "VERSION": "1.0.0",
    "SWAGGER_UI_SETTINGS": {"persistAuthorization": True},
    "ENUM_NAME_OVERRIDES": {
        "VisibilityEnum": "quiz.constants.VISIBILITY_CHOICES",
        "AlertThreadStatusEnum": "quiz.models.QuizAlertThread.STATUS_CHOICES",
        "JoinRequestStatusEnum": "domain.models.DomainJoinRequest.STATUS_CHOICES",
        "SystemCheckResponseStatusEnum": [("ok", "ok"), ("error", "error"), ("skipped", "skipped")],
    },
    "COMPONENT_SPLIT_REQUEST": True,
}

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / env("MEDIA_ROOT_DIR")
# Make uploaded media world-readable so nginx (running as www-data) can
# serve them under /media/. Without this, files inherit the temp-file
# permissions from the upload handler which are typically 0o600 and
# unreadable for the web server.
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

EMAIL_BACKEND = env("EMAIL_BACKEND")
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
MS_GRAPH_TENANT_ID = env("MS_GRAPH_TENANT_ID")
MS_GRAPH_CLIENT_ID = env("MS_GRAPH_CLIENT_ID")
MS_GRAPH_CLIENT_SECRET = env("MS_GRAPH_CLIENT_SECRET")
MS_GRAPH_SENDER_USER_ID = env("MS_GRAPH_SENDER_USER_ID")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL").rstrip("/")
PASSWORD_RESET_FRONTEND_PATH_PREFIX = "/" + env("PASSWORD_RESET_FRONTEND_PATH_PREFIX").strip("/")
CELERY_BROKER_URL = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND")
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
CELERY_TASK_DEFAULT_QUEUE = env("CELERY_TASK_DEFAULT_QUEUE")
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BEAT_SCHEDULE = {
    "notify-visibility-unlocks": {
        "task": "core.tasks.notify_visibility_unlocks",
        "schedule": 300.0,  # every 5 minutes
    },
    "auto-decline-stale-join-requests": {
        "task": "domain.tasks.auto_decline_stale_join_requests_task",
        "schedule": 24 * 3600.0,  # once a day
    },
    "send-expiring-join-request-warnings": {
        "task": "domain.tasks.send_expiring_join_request_warnings_task",
        "schedule": 24 * 3600.0,  # once a day
    },
    "expire-pending-course-invites": {
        "task": "lms_enrollment.tasks.expire_pending_course_invites",
        "schedule": 3600.0,  # once an hour
    },
    "send-course-invite-reminders": {
        "task": "lms_enrollment.tasks.send_course_invite_reminders",
        "schedule": 3600.0,  # once an hour — idempotency comes from
        # the per-row ``reminder_sent_at`` stamp, not the cadence.
    },
}

# Course-invite feature kill switch. When False, every invite endpoint
# (send, list, accept, …) returns 503 and the catalog visibility filter
# stops exposing invite-only courses through the invite branch. Lets
# the operator pull the plug on the feature without a code redeploy.
LMS_COURSE_INVITES_ENABLED = env("LMS_COURSE_INVITES_ENABLED")

# Hard cap on the size of a single ``POST course/<id>/invite-bulk/``
# request. Above this the endpoint 400s — guards against a runaway
# instructor pasting a 50k-line CSV and tying up a worker for
# minutes.
LMS_COURSE_INVITE_BULK_MAX = env("LMS_COURSE_INVITE_BULK_MAX")
# Lead time (hours before ``expires_at``) for the J-3 reminder email
# fired by :func:`lms_enrollment.tasks.send_course_invite_reminders`.
# Default 72 h matches the docs and gives invitees a full day to react
# during a business week. Set to 0 to disable the reminder entirely
# without touching the beat schedule (the task is a no-op when the
# value is 0).
LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE = env("LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE")
DATA_UPLOAD_MAX_MEMORY_SIZE = env("DATA_UPLOAD_MAX_MEMORY_SIZE")
FILE_UPLOAD_MAX_MEMORY_SIZE = env("FILE_UPLOAD_MAX_MEMORY_SIZE")
MAX_UPLOAD_FILE_SIZE = env("MAX_UPLOAD_FILE_SIZE")
QUIZ_ASSIGNMENT_ALERT_CLOSE_IMMEDIATELY = env("QUIZ_ASSIGNMENT_ALERT_CLOSE_IMMEDIATELY")
QUIZ_ASSIGNMENT_ALERT_REPORTER_REPLY_ALLOWED = env("QUIZ_ASSIGNMENT_ALERT_REPORTER_REPLY_ALLOWED")

SENSITIVE_FIELDS = {
    "password",
    "password1",
    "password2",
    "old_password",
    "new_password",
    "token",
    "access",
    "refresh",
    "api_key",
    "secret",
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "log_context": {
            "()": "config.log_middleware.LogContextFilter",
        },
    },
    "formatters": {
        "structured": {
            "format": "%(asctime)s %(levelname)s %(name)s req=%(request_id)s user=%(user_id)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
            "filters": ["log_context"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

DEV_LOGGING = deepcopy(LOGGING)
DEV_LOGGING["root"]["level"] = "DEBUG"

PROD_LOGGING = deepcopy(LOGGING)
PROD_LOGGING["root"]["level"] = "INFO"

DEEPL_AUTH_KEY = env("DEEPL_AUTH_KEY", default="")
USE_DEEPL = env.bool("USE_DEEPL", default=False)
DEEPL_IS_FREE = env.bool("DEEPL_IS_FREE", default=True)

PARLER_LANGUAGES = {
    None: tuple({"code": code} for code, _ in LANGUAGES),
    "default": {
        "fallbacks": ["fr"],
        "hide_untranslated": False,
    },
}

X_FRAME_OPTIONS = "DENY"
