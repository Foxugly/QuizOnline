from django.db.models import Q
from parler.managers import TranslatableQuerySet

from config.permissions import is_authenticated_user, is_django_admin


class LessonQuerySet(TranslatableQuerySet):
    def published(self):
        return self.filter(is_published=True)

    def visible_to(self, user):
        from course.models import Course
        if not is_authenticated_user(user):
            return self.none()
        visible_courses = Course.objects.visible_to(user).values("id")
        qs = self.filter(section__course_id__in=visible_courses)
        if is_django_admin(user):
            return qs
        # Instructors (domain owner / manager) manage every lesson in
        # their domain — published or not — so they can edit drafts and
        # toggle publication state (mirrors ``Course.visible_to`` which
        # surfaces unpublished managed courses). Plain learners only see
        # published / preview lessons.
        managed = Q(section__course__domain__owner=user) | Q(
            section__course__domain__managers=user
        )
        return qs.filter(
            managed | Q(is_published=True) | Q(is_preview=True)
        ).distinct()
