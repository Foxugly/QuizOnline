from parler.managers import TranslatableQuerySet


class ContentBlockQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        from lesson.models import Lesson
        visible_lessons = Lesson.objects.visible_to(user).values("id")
        return self.filter(lesson_id__in=visible_lessons)
