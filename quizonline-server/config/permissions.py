from __future__ import annotations

from rest_framework.permissions import BasePermission


def is_authenticated_user(user) -> bool:
    return bool(user and getattr(user, "is_authenticated", False))


def is_django_admin(user) -> bool:
    """True si l'utilisateur est staff Django (is_staff) ou superuser — donne accès à l'admin Django."""
    return bool(
        is_authenticated_user(user)
        and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
    )


class IsDjangoAdmin(BasePermission):
    """Autorise is_staff ou is_superuser (cohérent avec is_django_admin)."""

    def has_permission(self, request, view):
        return is_django_admin(request.user)


class IsSuperUser(BasePermission):
    """Autorise uniquement les superusers."""

    def has_permission(self, request, view):
        return bool(
            is_authenticated_user(request.user)
            and getattr(request.user, "is_superuser", False)
        )
