from django.db.models import Q
from parler.managers import TranslatableQuerySet


class BlockQuerySet(TranslatableQuerySet):
    def visible_to(self, user):
        """Restrict blocks to those the user may see.

        Three host kinds are supported:

        - **Lesson**: visible when the host lesson is visible (see
          ``LessonQuerySet.visible_to`` for the published / preview /
          instructor rules).
        - **Question / AnswerOption** (Phase 3.5): visible when the
          calling user can manage the owning domain. Anonymous users
          never see Question-hosted blocks via this endpoint — the
          question read path goes through ``/api/question/`` which has
          its own permission gate. The block detail endpoint mirrors
          that posture and only surfaces these to domain instructors.
        """
        from django.contrib.contenttypes.models import ContentType

        from lesson.models import Lesson
        from question.models import AnswerOption, Question

        lesson_ct = ContentType.objects.get_for_model(Lesson)
        question_ct = ContentType.objects.get_for_model(Question)
        answer_option_ct = ContentType.objects.get_for_model(AnswerOption)

        visible_lesson_ids = list(
            Lesson.objects.visible_to(user).values_list("id", flat=True)
        )
        scope = Q(
            target_content_type=lesson_ct,
            target_object_id__in=visible_lesson_ids,
        )

        # Question / AnswerOption hosts: only domain instructors may
        # read the raw block list. Anonymous users get nothing.
        if user is not None and getattr(user, "is_authenticated", False):
            if getattr(user, "is_superuser", False):
                scope |= Q(target_content_type__in=[question_ct, answer_option_ct])
            else:
                manageable_domain_ids = list(
                    user.owned_domains.values_list("id", flat=True)
                ) + list(
                    user.managed_domains.values_list("id", flat=True)
                )
                if manageable_domain_ids:
                    manageable_question_ids = list(
                        Question.objects.filter(domain_id__in=manageable_domain_ids)
                        .values_list("id", flat=True)
                    )
                    manageable_answer_ids = list(
                        AnswerOption.objects.filter(
                            question__domain_id__in=manageable_domain_ids
                        ).values_list("id", flat=True)
                    )
                    scope |= Q(
                        target_content_type=question_ct,
                        target_object_id__in=manageable_question_ids,
                    )
                    scope |= Q(
                        target_content_type=answer_option_ct,
                        target_object_id__in=manageable_answer_ids,
                    )

        return self.filter(scope)
