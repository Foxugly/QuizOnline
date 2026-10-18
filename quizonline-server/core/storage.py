"""Storage for files that must never be served publicly by nginx.

``PrivateMediaStorage`` writes under ``settings.PRIVATE_MEDIA_ROOT`` (outside
``MEDIA_ROOT``) and has no ``base_url``: the only way to read a file back is a
Django view that checks permissions first and streams it.

The location is read from settings on every access (not frozen at import) so
``override_settings`` / pytest's ``settings`` fixture can redirect it.
"""

import os
import uuid
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateMediaStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(
            base_url=None,
            file_permissions_mode=0o640,
            directory_permissions_mode=0o750,
        )

    @property
    def base_location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):  # pragma: no cover — defensive
        raise ValueError("Private files have no public URL.")


_private_storage = PrivateMediaStorage()


def private_storage():
    """Callable storage (keeps migrations free of a concrete location)."""
    return _private_storage


def random_name(prefix: str, filename: str, *, keep_name: bool = False) -> str:
    """``<prefix>/<uuid4hex><ext>`` — or ``<prefix>/<uuid4hex>/<name>`` when the
    original file name is worth keeping for display. Either way the path holds
    128 random bits, so it cannot be guessed or enumerated."""
    original = PurePosixPath(filename.replace("\\", "/")).name
    token = uuid.uuid4().hex
    if keep_name and original:
        return f"{prefix.rstrip('/')}/{token}/{original}"
    suffix = PurePosixPath(original).suffix.lower()
    return f"{prefix.rstrip('/')}/{token}{suffix}"
