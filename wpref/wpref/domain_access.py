from __future__ import annotations


def manageable_domain_ids(user) -> set[int]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return set(user.get_manageable_domains().values_list("id", flat=True))


def user_can_access_domain(user, domain_id: int | None) -> bool:
    if domain_id is None:
        return True
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    return domain_id in manageable_domain_ids(user)
