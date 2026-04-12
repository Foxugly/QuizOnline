from rest_framework.permissions import BasePermission

from config.permissions import is_authenticated_user
from domain.models import JoinPolicy


class IsDomainOwnerOrManager(BasePermission):
    """Autorise le superuser Django, le owner du domaine, ou un manager du domaine (Domain.managers M2M)."""
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not is_authenticated_user(user):
            return False
        if getattr(user, "is_superuser", False):
            return True
        if obj.owner_id == user.id:
            return True
        return obj.managers.filter(id=user.id).exists()


class CanApproveJoinRequest(BasePermission):
    """
    Object-level permission for the domain on which a join request lives.
    Authorized: superuser; the domain owner (always); a domain manager
    only if the policy is `owner_managers`.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not is_authenticated_user(user):
            return False
        if getattr(user, "is_superuser", False):
            return True
        if obj.owner_id == user.id:
            return True
        if obj.join_policy == JoinPolicy.OWNER_MANAGERS:
            return obj.managers.filter(id=user.id).exists()
        return False
