from __future__ import annotations


def manageable_domain_ids(user) -> set[int]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    cache_attr = "_manageable_domain_ids_cache"
    if not hasattr(user, cache_attr):
        setattr(user, cache_attr, set(user.get_manageable_domains().values_list("id", flat=True)))
    return getattr(user, cache_attr)


def visible_domain_ids(user) -> set[int]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    cache_attr = "_visible_domain_ids_cache"
    if not hasattr(user, cache_attr):
        setattr(user, cache_attr, set(user.get_visible_domains().values_list("id", flat=True)))
    return getattr(user, cache_attr)


def user_can_access_domain(user, domain_id: int | None) -> bool:
    if domain_id is None:
        return True
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return domain_id in visible_domain_ids(user)
