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
        # published / preview lessons of a published section.
        managed = Q(section__course__domain__owner=user) | Q(
            section__course__domain__managers=user
        )
        return qs.filter(
            managed
            | (Q(section__is_published=True) & (Q(is_published=True) | Q(is_preview=True)))
        ).distinct()

    def content_readable_by(self, user):
        """``visible_to`` narrowed to the lessons whose CONTENT (blocks,
        lesson quizzes) the caller may read: the course's content is
        readable (``Course.objects.content_readable_by``) or the lesson is
        a preview — the explicit free teaser of a course. Mirrors
        :func:`course.permissions.can_read_lesson_content`."""
        from course.models import Course

        qs = self.visible_to(user)
        if is_django_admin(user):
            return qs
        readable_courses = Course.objects.content_readable_by(user).values("id")
        return qs.filter(Q(is_preview=True) | Q(section__course_id__in=readable_courses))
