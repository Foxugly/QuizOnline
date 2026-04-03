from rest_framework import permissions

from config.permissions import is_authenticated_user, is_staff_user


class IsSelfOrStaffOrSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        return is_staff_user(request.user) or obj == request.user


class IsSelf(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        return obj == request.user
