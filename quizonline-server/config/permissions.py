from __future__ import annotations


def is_authenticated_user(user) -> bool:
    return bool(user and getattr(user, "is_authenticated", False))


def is_django_admin(user) -> bool:
    """True si l'utilisateur est staff Django (is_staff) ou superuser — donne accès à l'admin Django."""
    return bool(
        is_authenticated_user(user)
        and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
    )
