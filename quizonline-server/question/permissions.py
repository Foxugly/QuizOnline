from rest_framework.permissions import BasePermission

from config.permissions import is_authenticated_user


class IsQuestionDomainManager(BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(getattr(request, "user", None))

    def has_object_permission(self, request, view, obj):
        user = getattr(request, "user", None)
        if not is_authenticated_user(user):
            return False
        if getattr(user, "is_superuser", False):
            return True
        return bool(hasattr(user, "can_manage_domain") and user.can_manage_domain(obj.domain))
