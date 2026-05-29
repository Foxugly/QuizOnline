from django.db.models import Q
from parler.managers import TranslatableQuerySet

from config.permissions import is_authenticated_user, is_django_admin


class LessonQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        from course.models import Course
        if not is_authenticated_user(user):
            return self.none()
        visible_courses = Course.objects.visible_to(user).values("id")
        qs = self.filter(section__course_id__in=visible_courses)
        if is_django_admin(user):
            return qs
        return qs.filter(Q(is_published=True) | Q(is_preview=True))
