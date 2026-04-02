from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

from .querysets import accessible_quiz_template_queryset


def _user_visible_domain_ids(user) -> set[int]:
    visible_domain_ids: set[int] = set()
    if getattr(user, "current_domain_id", None):
        visible_domain_ids.add(user.current_domain_id)
    if hasattr(user, "owned_domains"):
        visible_domain_ids.update(user.owned_domains.values_list("id", flat=True))
    if hasattr(user, "managed_domains"):
        visible_domain_ids.update(user.managed_domains.values_list("id", flat=True))
    return visible_domain_ids


def user_matches_template_domain(user, quiz_template) -> bool:
    if quiz_template.domain_id is None:
        return True
    return quiz_template.domain_id in _user_visible_domain_ids(user)


def _can_access_public_template(user, quiz_template) -> bool:
    if not quiz_template.is_public:
        return False
    if getattr(user, "is_superuser", False):
        return True
    if getattr(user, "is_staff", False):
        return user_matches_template_domain(user, quiz_template)
    return True


def user_can_access_template(user, quiz_template) -> bool:
    if user.is_superuser:
        return True
    if quiz_template.created_by_id == getattr(user, "id", None):
        return True
    if quiz_template.quiz.filter(user=user).exists():
        return True
    return _can_access_public_template(user, quiz_template)


def filter_accessible_templates(user, templates):
    if hasattr(templates, "filter"):
        return accessible_quiz_template_queryset(user)
    if user.is_superuser:
        return templates
    return [quiz_template for quiz_template in templates if user_can_access_template(user, quiz_template)]


def user_can_manage_template_assignments(user, quiz_template) -> bool:
    return bool(
        user
        and (
            user.is_superuser
            or quiz_template.created_by_id == user.id
            or user_matches_template_domain(user, quiz_template)
        )
    )


def user_can_create_quiz_from_template(user, quiz_template) -> bool:
    if user.is_superuser:
        return True
    if quiz_template.created_by_id == user.id:
        return True
    return _can_access_public_template(user, quiz_template)


def validate_target_user_domain(quiz_template, target_user) -> None:
    if quiz_template.domain_id is None:
        return
    if not _user_visible_domain_ids(target_user):
        return
    if user_matches_template_domain(target_user, quiz_template):
        return
    raise PermissionDenied("L'utilisateur cible n'appartient pas au meme domaine que ce quiz.")
