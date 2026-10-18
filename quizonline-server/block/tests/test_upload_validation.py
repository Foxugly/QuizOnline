"""Block uploads are restricted to the types the editor needs, checked by
extension AND by content (magic bytes), and stored under a random path."""

import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from block.models import Block
from block.upload_validation import validate_block_file, validate_block_image
from course.models import Section
from lesson.models import Lesson

PDF = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\n%%EOF"
ZIP = b"PK\x03\x04" + b"\x00" * 40


def _png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(buf, format="PNG")
    return buf.getvalue()


def _up(name, data, ctype="application/octet-stream"):
    return SimpleUploadedFile(name, data, content_type=ctype)


@pytest.mark.parametrize(
    "name,data",
    [
        ("course.pdf", PDF),
        ("slides.pptx", ZIP),
        ("notes.docx", ZIP),
        ("data.xlsx", ZIP),
        ("bundle.zip", ZIP),
        ("legacy.doc", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 40),
        ("readme.txt", "Bonjour à tous\nligne 2\n".encode()),
        ("table.csv", b"a;b;c\n1;2;3\n"),
        ("photo.png", None),
        ("clip.mp4", b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 40),
        ("sound.mp3", b"ID3\x03\x00" + b"\x00" * 40),
    ],
)
def test_file_block_accepts_allowed_types(name, data):
    validate_block_file(_up(name, data if data is not None else _png_bytes()))


@pytest.mark.parametrize(
    "name,data",
    [
        ("page.html", b"<html><script>alert(1)</script></html>"),
        ("page.htm", b"<html></html>"),
        ("image.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>"),
        ("app.js", b"alert(1)"),
        ("run.exe", b"MZ\x90\x00"),
        ("noext", PDF),
        # right extension, wrong content
        ("fake.pdf", b"<html><script>alert(1)</script></html>"),
        ("fake.docx", b"<html></html>"),
        ("fake.png", b"<html></html>"),
        ("fake.txt", b"<!doctype html><script>alert(1)</script>"),
        ("binary.txt", b"abc\x00def"),
    ],
)
def test_file_block_rejects_other_types(name, data):
    with pytest.raises(ValidationError):
        validate_block_file(_up(name, data))


def test_image_block_accepts_real_image():
    validate_block_image(_up("photo.png", _png_bytes(), "image/png"))


@pytest.mark.parametrize(
    "name,data",
    [
        ("photo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>"),
        ("photo.png", b"<html></html>"),
        ("photo.html", None),
        ("photo.bmp", None),
    ],
)
def test_image_block_rejects_other_types(name, data):
    with pytest.raises(ValidationError):
        validate_block_image(_up(name, data if data is not None else _png_bytes()))


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def file_block(db, course):
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="l-up", order=0, is_published=True)
    return Block.objects.create(target=lesson, block_type=Block.TYPE_FILE, order=0)


@pytest.fixture
def media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"
    return settings.MEDIA_ROOT


@pytest.mark.django_db
def test_api_rejects_html_upload_on_file_block(file_block, owner, media_root):
    r = _auth(owner).patch(
        f"/api/v1/block/{file_block.id}/",
        {"file": _up("evil.html", b"<html><script>alert(1)</script></html>", "text/html")},
        format="multipart",
    )
    assert r.status_code == 400, r.content
    assert "file" in r.json()


@pytest.mark.django_db
def test_api_stores_upload_under_random_path(file_block, owner, media_root):
    r = _auth(owner).patch(
        f"/api/v1/block/{file_block.id}/",
        {"file": _up("Syllabus.pdf", PDF, "application/pdf")},
        format="multipart",
    )
    assert r.status_code == 200, r.content
    file_block.refresh_from_db()
    parts = file_block.file.name.split("/")
    assert parts[:3] == ["lms", "blocks", "file"]
    assert len(parts[3]) == 32  # uuid4 hex directory
    assert parts[4] == "Syllabus.pdf"
