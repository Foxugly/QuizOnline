import pytest

from course.models import Course


@pytest.mark.django_db
def test_visible_to_anonymous_returns_empty(course):
    from django.contrib.auth.models import AnonymousUser
    assert Course.objects.visible_to(AnonymousUser()).count() == 0


@pytest.mark.django_db
def test_visible_to_member_only_sees_published(domain, course, fr_lang):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(email="l@x.com", password="x")
    domain.members.add(learner)
    assert Course.objects.visible_to(learner).count() == 0
    from django.utils import timezone
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    assert Course.objects.visible_to(learner).count() == 1


@pytest.mark.django_db
def test_visible_to_owner_sees_unpublished(domain, course, owner):
    assert Course.objects.visible_to(owner).filter(pk=course.pk).exists()


@pytest.mark.django_db
def test_visible_to_superuser_sees_all(course):
    from customuser.models import CustomUser
    su = CustomUser.objects.create_superuser(email="su@x.com", password="x")
    assert Course.objects.visible_to(su).count() == 1