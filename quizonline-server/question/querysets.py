from __future__ import annotations

from question.models import Question
from config.domain_access import visible_domain_ids


def question_queryset():
    return (
        Question.objects
        .select_related("domain")
        .prefetch_related(
            "subjects",
            "translations",
            # Phase 3 LMS refactor: AnswerOption is no longer parler-
            # translated — content lives as Block rows. Prefetch the
            # option blocks (+ their translations) so the read serializer
            # never hits a N+1 walking option content.
            "answer_options__blocks__translations",
            "blocks__translations",
        )
    )


def accessible_question_queryset(user):
    queryset = question_queryset()
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if getattr(user, "is_superuser", False):
        return queryset

    allowed_domain_ids = visible_domain_ids(user)
    if not allowed_domain_ids:
        return queryset.none()

    return queryset.filter(domain_id__in=allowed_domain_ids).distinct()
