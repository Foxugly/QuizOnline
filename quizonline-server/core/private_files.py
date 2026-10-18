"""Serve a file from private storage once the caller has been authorised."""

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.utils.http import content_disposition_header


def private_file_response(field_file, *, filename: str, content_type: str):
    """Attachment response for a file in ``core.storage.PrivateMediaStorage``.

    With ``PRIVATE_MEDIA_X_ACCEL_PREFIX`` set, nginx streams the file from its
    ``internal`` location (the worker is not tied up); otherwise Django does.
    Never cached by shared caches."""
    prefix = settings.PRIVATE_MEDIA_X_ACCEL_PREFIX
    if prefix:
        response = HttpResponse(content_type=content_type)
        response["X-Accel-Redirect"] = f"/{prefix.strip('/')}/{field_file.name.lstrip('/')}"
        response["Content-Disposition"] = content_disposition_header(True, filename)
    else:
        response = FileResponse(
            field_file.open("rb"), as_attachment=True, filename=filename, content_type=content_type,
        )
    response["Cache-Control"] = "private, no-store"
    return response
