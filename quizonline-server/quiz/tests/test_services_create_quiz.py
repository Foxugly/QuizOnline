from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone, translation

from domain.models import Domain
from quiz.models import QuizTemplate
from quiz.services import QuizAlreadyStartedError, create_quiz_for_user

User = get_user_model()


@pytest.fixture(autouse=True)
def _active_language():
    # Domain.name / QuizTemplate.title are parler-translated — a language must
    # be active when they are saved.
    translation.activate("fr")


@pytest.fixture
def owner(db):
    return User.objects.create_user(email="owner-cq@ex.com", password="x")


@pytest.fixture
def domain(db, owner):
    return Domain.objects.create(owner=owner, name="D", description="", active=True)


def _template(domain, mode):
    return QuizTemplate.objects.create(
        domain=domain,
        title=f"T-{mode}",
        mode=mode,
        max_questions=10,
        permanent=True,
        active=True,
        with_duration=False,
        duration=10,
    )


@pytest.mark.django_db
def test_non_exam_always_creates_new(domain, owner):
    qt = _template(domain, QuizTemplate.MODE_PRACTICE)
    quiz, created = create_quiz_for_user(quiz_template=qt, target_user=owner)
    assert created is True
    assert quiz.pk is not None
    # No single-attempt guard for practice: a second call creates another.
    other, created2 = create_quiz_for_user(quiz_template=qt, target_user=owner)
    assert created2 is True
    assert other.pk != quiz.pk


@pytest.mark.django_db
def test_exam_returns_existing_unstarted(domain, owner):
    qt = _template(domain, QuizTemplate.MODE_EXAM)
    quiz, created = create_quiz_for_user(quiz_template=qt, target_user=owner)
    assert created is True
    again, created2 = create_quiz_for_user(quiz_template=qt, target_user=owner)
    assert created2 is False
    assert again.pk == quiz.pk


@pytest.mark.django_db
def test_exam_already_started_raises(domain, owner):
    qt = _template(domain, QuizTemplate.MODE_EXAM)
    quiz, _ = create_quiz_for_user(quiz_template=qt, target_user=owner)
    quiz.started_at = timezone.now()
    quiz.save(update_fields=["started_at"])
    with pytest.raises(QuizAlreadyStartedError):
        create_quiz_for_user(quiz_template=qt, target_user=owner)


@pytest.mark.django_db
@patch("quiz.services.notify_quiz_assigned_on_commit")
def test_notifies_when_assigned_to_another_user(mock_notify, domain, owner):
    qt = _template(domain, QuizTemplate.MODE_PRACTICE)
    other = User.objects.create_user(email="other-cq@ex.com", password="x")
    create_quiz_for_user(quiz_template=qt, target_user=other, assigned_by=owner)
    mock_notify.assert_called_once()


@pytest.mark.django_db
@patch("quiz.services.notify_quiz_assigned_on_commit")
def test_no_notify_on_self_create(mock_notify, domain, owner):
    qt = _template(domain, QuizTemplate.MODE_PRACTICE)
    create_quiz_for_user(quiz_template=qt, target_user=owner, assigned_by=owner)
    mock_notify.assert_not_called()
