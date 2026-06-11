from __future__ import annotations

from question.models import Question
from config.domain_access import manageable_domain_ids


def question_queryset():
    return (
        Question.objects
        .select_related("domain", "domain__owner")
        .prefetch_related(
            "subjects",
            "translations",
            # Phase 3 LMS refactor: AnswerOption is no longer parler-
            # translated — content lives as Block rows. Prefetch the
            # option blocks (+ their translations) so the read serializer
            # never hits a N+1 walking option content.
            "answer_options__blocks__translations",
            "blocks__translations",
            # The QuestionReadSerializer embeds the full DomainReadSerializer
            # for ``domain``. Prefetch the domain relations it walks
            # (translations, allowed languages, owner/managers/members)
            # so rendering the nested domain per question row does not
            # issue a fresh batch of queries per row. ``get_available_lang_codes``
            # also reads ``domain.allowed_languages``.
            "domain__translations",
            "domain__allowed_languages",
            "domain__managers",
            "domain__members",
        )
    )


def accessible_question_queryset(user):
    queryset = question_queryset()
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if getattr(user, "is_superuser", False):
        return queryset

    # MANAGEABLE (owner|managers), NOT visible (which also OR-in members): the
    # /api/question/ endpoint is the question EDITOR and exposes is_correct, so
    # a domain member/learner must not be able to list its questions and read
    # the right answers (incl. exam questions). Only domain managers do.
    allowed_domain_ids = manageable_domain_ids(user)
    if not allowed_domain_ids:
        return queryset.none()

    return queryset.filter(domain_id__in=allowed_domain_ids).distinct()
