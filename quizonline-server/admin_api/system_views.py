from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse

from django.conf import settings
from django.core.mail import get_connection
from django.db import connection
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from config.tools import ErrorDetailSerializer
from translation.services.deepl import DeepLError, deepl_translate_many


def _mask_value(value: str, *, keep_start: int = 2, keep_end: int = 2) -> str:
    if not value:
        return ""
    if len(value) <= keep_start + keep_end:
        return "*" * len(value)
    return f"{value[:keep_start]}{'*' * (len(value) - keep_start - keep_end)}{value[-keep_end:]}"


def _database_summary() -> dict:
    db = settings.DATABASES["default"]
    engine = db.get("ENGINE", "")
    name = str(db.get("NAME", "") or "")
    host = str(db.get("HOST", "") or "")
    port = str(db.get("PORT", "") or "")
    parsed = urlparse(str(getattr(settings, "DATABASE_URL", "") or ""))

    if "sqlite" in engine:
        display_name = Path(name).name if name else "db.sqlite3"
        host_display = ""
    else:
        display_name = name or parsed.path.lstrip("/")
        host_display = host or parsed.hostname or ""

    return {
        "engine": engine.rsplit(".", 1)[-1] if engine else "unknown",
        "name": display_name,
        "host": _mask_value(host_display, keep_start=2, keep_end=0) if host_display else "",
        "port": str(port or parsed.port or ""),
        "conn_max_age": db.get("CONN_MAX_AGE", 0),
    }


def _email_summary() -> dict:
    backend = settings.EMAIL_BACKEND.rsplit(".", 1)[-1]
    return {
        "backend": backend,
        "host": settings.EMAIL_HOST,
        "port": settings.EMAIL_PORT,
        "use_tls": settings.EMAIL_USE_TLS,
        "host_user": _mask_value(settings.EMAIL_HOST_USER, keep_start=2, keep_end=0),
        "host_password_configured": bool(settings.EMAIL_HOST_PASSWORD),
        "default_from_email": settings.DEFAULT_FROM_EMAIL,
        "celery_broker_url": _mask_value(settings.CELERY_BROKER_URL, keep_start=10, keep_end=0),
        "celery_result_backend": _mask_value(settings.CELERY_RESULT_BACKEND, keep_start=10, keep_end=0),
    }


def _upload_summary() -> dict:
    media_root = Path(settings.MEDIA_ROOT)
    return {
        "media_root": str(media_root),
        "media_root_exists": media_root.exists(),
        "data_upload_max_memory_size": settings.DATA_UPLOAD_MAX_MEMORY_SIZE,
        "file_upload_max_memory_size": settings.FILE_UPLOAD_MAX_MEMORY_SIZE,
        "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
    }


def _deepl_summary() -> dict:
    return {
        "enabled": bool(settings.USE_DEEPL),
        "auth_key_configured": bool(settings.DEEPL_AUTH_KEY),
        "is_free": bool(settings.DEEPL_IS_FREE),
    }


def _run_db_check() -> dict:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        row = cursor.fetchone()
    return {
        "target": "db",
        "status": "ok" if row and row[0] == 1 else "error",
        "detail": f"Database connection OK ({connection.vendor}).",
        "checked_at": timezone.localtime().isoformat(),
    }


def _run_upload_check() -> dict:
    media_root = Path(settings.MEDIA_ROOT)
    media_root.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=media_root, prefix="system-check-", suffix=".tmp", delete=False) as tmp:
        tmp.write(b"quizonline upload check")
        tmp_path = Path(tmp.name)
    tmp_path.unlink(missing_ok=True)
    return {
        "target": "upload",
        "status": "ok",
        "detail": f"Upload directory is writable: {media_root}",
        "checked_at": timezone.localtime().isoformat(),
    }


def _run_email_check() -> dict:
    backend_path = settings.EMAIL_BACKEND
    email_backend = get_connection(fail_silently=False)
    if backend_path == "core.email_backends.microsoft_graph.EmailBackend":
        email_backend._fetch_access_token()
        detail = "Microsoft Graph email authentication OK."
    else:
        email_backend.open()
        email_backend.close()
        detail = "Email backend connection OK."
    return {
        "target": "email",
        "status": "ok",
        "detail": detail,
        "checked_at": timezone.localtime().isoformat(),
    }


def _run_deepl_check() -> dict:
    if not settings.USE_DEEPL:
        return {
            "target": "deepl",
            "status": "skipped",
            "detail": "DeepL is disabled.",
            "checked_at": timezone.localtime().isoformat(),
        }
    if not settings.DEEPL_AUTH_KEY:
        return {
            "target": "deepl",
            "status": "error",
            "detail": "DEEPL_AUTH_KEY is missing.",
            "checked_at": timezone.localtime().isoformat(),
        }
    translated = deepl_translate_many(["hello"], source="EN", target="FR")
    return {
        "target": "deepl",
        "status": "ok",
        "detail": f"DeepL responded successfully ({translated[0]}).",
        "checked_at": timezone.localtime().isoformat(),
    }


class SystemCheckRequestSerializer(serializers.Serializer):
    target = serializers.ChoiceField(choices=["db", "email", "upload", "deepl"])


class SystemConfigSectionSerializer(serializers.Serializer):
    label = serializers.CharField()
    values = serializers.JSONField()


class SystemCheckResponseSerializer(serializers.Serializer):
    target = serializers.CharField()
    status = serializers.ChoiceField(choices=["ok", "error", "skipped"])
    detail = serializers.CharField()
    checked_at = serializers.CharField()


@extend_schema_view(
    get=extend_schema(
        tags=["Admin"],
        summary="Lire la configuration systeme effective",
        responses={200: OpenApiResponse(description="System configuration snapshot")},
    ),
)
class SystemConfigView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "sections": [
                {"label": "db", "values": _database_summary()},
                {"label": "email", "values": _email_summary()},
                {"label": "upload", "values": _upload_summary()},
                {"label": "deepl", "values": _deepl_summary()},
            ]
        })


@extend_schema_view(
    post=extend_schema(
        tags=["Admin"],
        summary="Lancer un check systeme",
        request=SystemCheckRequestSerializer,
        responses={
            200: SystemCheckResponseSerializer,
            400: OpenApiResponse(response=ErrorDetailSerializer, description="Validation error"),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
)
class SystemCheckView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = SystemCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = serializer.validated_data["target"]
        try:
            if target == "db":
                result = _run_db_check()
            elif target == "email":
                result = _run_email_check()
            elif target == "upload":
                result = _run_upload_check()
            else:
                result = _run_deepl_check()
        except (DeepLError, OSError, Exception) as exc:
            if isinstance(exc, KeyboardInterrupt):
                raise
            result = {
                "target": target,
                "status": "error",
                "detail": str(exc),
                "checked_at": timezone.localtime().isoformat(),
            }

        return Response(result, status=status.HTTP_200_OK)
