import pytest

from certificate.models import Certificate
from certificate.tasks import render_certificate_pdf


@pytest.mark.django_db
def test_render_certificate_pdf_creates_non_empty_file(course, learner):
    cert = Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-TEST-0001", verification_token="tok-test",
    )
    render_certificate_pdf(cert.id)
    cert.refresh_from_db()
    assert cert.pdf is not None
    assert cert.pdf.size > 100
    assert cert.pdf_rendered_at is not None
