from django.db.models import Q
from parler.managers import TranslatableQuerySet

from config.permissions import is_authenticated_user, is_django_admin


class CourseQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        if not is_authenticated_user(user):
            return self.none()
        if is_django_admin(user):
            return self.all()
        managed = Q(domain__owner=user) | Q(domain__managers=user)
        member = Q(domain__members=user) | Q(domain__owner=user) | Q(domain__managers=user)
        return self.filter(managed | (member & Q(is_published=True))).distinct()


class SectionQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        from .models import Course
        visible_courses = Course.objects.visible_to(user).values("id")
        return self.filter(course_id__in=visible_courses)


class LessonQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        from .models import Course
        if not is_authenticated_user(user):
            return self.none()
        visible_courses = Course.objects.visible_to(user).values("id")
        qs = self.filter(section__course_id__in=visible_courses)
        if is_django_admin(user):
            return qs
        return qs.filter(Q(is_published=True) | Q(is_preview=True))


class ContentBlockQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        from .models import Lesson
        visible_lessons = Lesson.objects.visible_to(user).values("id")
        return self.filter(lesson_id__in=visible_lessons)
