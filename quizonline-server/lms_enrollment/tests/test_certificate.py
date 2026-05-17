import pytest

from lms_enrollment.models import Certificate, CertificateSequence


@pytest.mark.django_db
def test_certificate_sequence_increment():
    s1 = CertificateSequence.objects.create(year=2026, counter=0)
    s1.counter = 5
    s1.save()
    assert CertificateSequence.objects.get(year=2026).counter == 5


@pytest.mark.django_db
def test_two_active_certificates_same_user_course_forbidden(course, learner):
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0001", verification_token="t1",
    )
    from django.db import IntegrityError
    with pytest.raises(IntegrityError):
        Certificate.objects.create(
            user=learner, course=course,
            certificate_number="QO-2026-0002", verification_token="t2",
        )


@pytest.mark.django_db
def test_revoked_certificate_allows_reissue(course, learner):
    from django.utils import timezone
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0001", verification_token="t1",
        revoked_at=timezone.now(),
    )
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0002", verification_token="t2",
    )
