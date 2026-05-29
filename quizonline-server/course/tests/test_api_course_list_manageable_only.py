"""Coverage for the ``GET /api/course/?manageable_only=1`` filter.

The instructor-side ``/course/list`` Angular page relies on this
to scope the paginated result to courses the caller actually manages.
Without the filter the same endpoint also leaks published courses the
caller is merely a member of, which would either pollute the admin
table or force the frontend to drop rows after the paginator already
sliced them (producing apparent gaps in the page count).
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from domain.models import Domain
from course.models import Course


@pytest.fixture
def second_user(db):
    return CustomUser.objects.create_user(
        username="manager", email="manager@x.com", password="x",
    )


@pytest.fixture
def third_user(db):
    return CustomUser.objects.create_user(
        username="member-only", email="member@x.com", password="x",
    )


@pytest.fixture
def two_domains(db, owner, second_user, third_user, fr_lang):
    """Two domains: ``owned`` (owner = ``owner``, manager = ``second_user``)
    and ``foreign`` (owner = ``third_user``, ``owner`` is a member only).
    Each has one published course."""
    owned = Domain.objects.create(owner=owner)
    owned.set_current_language("fr")
    owned.name = "Owned"
    owned.save()
    owned.allowed_languages.add(fr_lang)
    owned.managers.add(second_user)

    foreign = Domain.objects.create(owner=third_user)
    foreign.set_current_language("fr")
    foreign.name = "Foreign"
    foreign.save()
    foreign.allowed_languages.add(fr_lang)
    foreign.members.add(owner)  # owner is a learner there, NOT an instructor.

    c_owned = Course(
        domain=owned, slug="owned-1", language=fr_lang,
        level=Course.LEVEL_BEGINNER, is_published=True,
    )
    c_owned.set_current_language("fr")
    c_owned.title = "Owned course"
    c_owned.save()

    c_foreign = Course(
        domain=foreign, slug="foreign-1", language=fr_lang,
        level=Course.LEVEL_BEGINNER, is_published=True,
    )
    c_foreign.set_current_language("fr")
    c_foreign.title = "Foreign course"
    c_foreign.save()

    return owned, foreign, c_owned, c_foreign


@pytest.mark.django_db
def test_manageable_only_filters_to_owned_and_managed_courses(
    two_domains, owner, second_user, third_user,
):
    owned, foreign, c_owned, c_foreign = two_domains

    client = APIClient()
    client.force_authenticate(owner)

    # Sanity: without the filter, ``owner`` sees both courses
    # (instructor on ``owned``, member of ``foreign``).
    plain = client.get("/api/course/").json()
    slugs = {row["slug"] for row in plain["results"]}
    assert slugs == {"owned-1", "foreign-1"}

    # With ``manageable_only=1`` only the course in the domain the
    # caller owns or manages remains.
    filtered = client.get("/api/course/?manageable_only=1").json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["slug"] == "owned-1"

    # The second_user is a manager of ``owned`` — same scope as owner.
    client.force_authenticate(second_user)
    filtered = client.get("/api/course/?manageable_only=1").json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["slug"] == "owned-1"

    # The third_user only owns ``foreign``.
    client.force_authenticate(third_user)
    filtered = client.get("/api/course/?manageable_only=1").json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["slug"] == "foreign-1"


@pytest.mark.django_db
def test_manageable_only_returns_empty_for_pure_member(
    two_domains, owner, third_user,
):
    """A user who is neither owner nor manager anywhere gets an empty
    set — not a 403, not a leak. Lets the frontend render its empty
    state instead of erroring."""
    owned, foreign, *_ = two_domains
    # Make a fresh pure-member user on both domains.
    pure = CustomUser.objects.create_user(username="pure", password="x")
    owned.members.add(pure)
    foreign.members.add(pure)

    client = APIClient()
    client.force_authenticate(pure)
    body = client.get("/api/course/?manageable_only=1").json()
    assert body["count"] == 0
    assert body["results"] == []


@pytest.mark.django_db
def test_manageable_only_superuser_sees_everything(two_domains):
    """Superusers bypass the owner/manager scope — they manage every
    domain by policy."""
    su = CustomUser.objects.create_superuser(
        username="root", email="root@x.com", password="x",
    )
    client = APIClient()
    client.force_authenticate(su)
    body = client.get("/api/course/?manageable_only=1").json()
    slugs = {row["slug"] for row in body["results"]}
    assert slugs == {"owned-1", "foreign-1"}