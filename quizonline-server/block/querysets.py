from parler.managers import TranslatableQuerySet


class BlockQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        """Restrict blocks to those hanging off a Lesson the user may see.

        Phase 3 will broaden this to also surface blocks attached to
        Question / AnswerOption hosts. For now, only Lesson is a Block
        host so we filter exclusively against the visible-lesson set —
        any block whose ``target`` is something else is dropped on the
        floor, which is the safe default until the other host types
        carry their own visibility semantics.
        """
        from django.contrib.contenttypes.models import ContentType

        from lesson.models import Lesson
        visible_lesson_ids = list(
            Lesson.objects.visible_to(user).values_list("id", flat=True)
        )
        lesson_ct = ContentType.objects.get_for_model(Lesson)
        return self.filter(
            target_content_type=lesson_ct,
            target_object_id__in=visible_lesson_ids,
        )
