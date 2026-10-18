"""Allow-lists for Block uploads (image / file blocks).

Uploaded files are served from the app's own origin under ``/media/``, so a
file the browser would render as a document (HTML, SVG, XML, JS...) is a
stored-XSS vector. Only the types the editor needs are accepted, and each is
checked twice: by extension AND by its leading bytes (magic number), so a
renamed ``.html`` is refused. nginx adds ``Content-Disposition: attachment``
and a sandboxing CSP on top (``deploy/nginx``) as defence in depth.

Only NEW uploads are sniffed: an already-stored file is not re-read on every
model ``full_clean()``.
"""

from pathlib import PurePosixPath

from django.core.exceptions import ValidationError
from django.db.models.fields.files import FieldFile
from django.utils.translation import gettext_lazy as _

_OLE2 = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
_ZIP = (b"PK\x03\x04", b"PK\x05\x06")


def _is_pdf(head: bytes) -> bool:
    return head.startswith(b"%PDF-")


def _is_zip(head: bytes) -> bool:
    return head.startswith(_ZIP)


def _is_ole2(head: bytes) -> bool:
    return head.startswith(_OLE2)


def _is_png(head: bytes) -> bool:
    return head.startswith(b"\x89PNG\r\n\x1a\n")


def _is_jpeg(head: bytes) -> bool:
    return head.startswith(b"\xff\xd8\xff")


def _is_gif(head: bytes) -> bool:
    return head.startswith((b"GIF87a", b"GIF89a"))


def _is_webp(head: bytes) -> bool:
    return head[:4] == b"RIFF" and head[8:12] == b"WEBP"


def _is_mp4(head: bytes) -> bool:
    return head[4:8] == b"ftyp"


def _is_mp3(head: bytes) -> bool:
    return head.startswith(b"ID3") or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)


def _is_plain_text(head: bytes) -> bool:
    # No NUL bytes (binary), and nothing a browser could sniff as markup.
    if b"\x00" in head:
        return False
    return not head.lstrip(b"\xef\xbb\xbf \t\r\n").startswith(b"<")


IMAGE_SIGNATURES = {
    "png": _is_png,
    "jpg": _is_jpeg,
    "jpeg": _is_jpeg,
    "gif": _is_gif,
    "webp": _is_webp,
}

FILE_SIGNATURES = {
    "pdf": _is_pdf,
    # OOXML / OpenDocument / zip are all zip containers
    "docx": _is_zip,
    "xlsx": _is_zip,
    "pptx": _is_zip,
    "odt": _is_zip,
    "ods": _is_zip,
    "odp": _is_zip,
    "zip": _is_zip,
    # legacy Office (OLE2 compound file)
    "doc": _is_ole2,
    "xls": _is_ole2,
    "ppt": _is_ole2,
    "txt": _is_plain_text,
    "csv": _is_plain_text,
    "mp3": _is_mp3,
    "mp4": _is_mp4,
    **IMAGE_SIGNATURES,
}


def _read_head(value, size: int = 8192) -> bytes:
    f = getattr(value, "file", None) or value
    try:
        pos = f.tell()
    except (AttributeError, OSError):
        pos = None
    f.seek(0)
    head = f.read(size) or b""
    if pos is not None:
        f.seek(pos)
    return head if isinstance(head, bytes) else head.encode()


def _validate(value, signatures: dict) -> None:
    if not value:
        return
    if isinstance(value, FieldFile) and getattr(value, "_committed", True):
        return  # already stored: validated when it was uploaded
    ext = PurePosixPath(str(getattr(value, "name", "") or "")).suffix.lower().lstrip(".")
    check = signatures.get(ext)
    if check is None:
        raise ValidationError(
            _("File type “.%(ext)s” is not allowed. Allowed: %(allowed)s."),
            code="invalid_extension",
            params={"ext": ext or "?", "allowed": ", ".join(sorted(signatures))},
        )
    if not check(_read_head(value)):
        raise ValidationError(
            _("The file content does not match its “.%(ext)s” extension."),
            code="invalid_content",
            params={"ext": ext},
        )


def validate_block_image(value) -> None:
    _validate(value, IMAGE_SIGNATURES)


def validate_block_file(value) -> None:
    _validate(value, FILE_SIGNATURES)
