from __future__ import annotations

from question.models import Question


def question_queryset():
    return (
        Question.objects
        .select_related("domain")
        .prefetch_related("subjects", "translations", "answer_options__translations", "media__asset")
    )


def accessible_question_queryset(user):
    queryset = question_queryset()
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    if getattr(user, "is_superuser", False):
        return queryset

    visible_domain_ids = set()
    if getattr(user, "current_domain_id", None):
        visible_domain_ids.add(user.current_domain_id)

    visible_domain_ids.update(user.owned_domains.values_list("id", flat=True))
    visible_domain_ids.update(user.managed_domains.values_list("id", flat=True))

    if not visible_domain_ids:
        return queryset.none()

    return queryset.filter(domain_id__in=visible_domain_ids).distinct()
