from rest_framework.permissions import BasePermission

from config.permissions import is_authenticated_user, is_django_admin
from course.permissions import is_lms_instructor


class IsEnrollmentOwnerOrInstructor(BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        if is_django_admin(request.user):
            return True
        owner_id = getattr(obj, "user_id", None)
        if owner_id == request.user.id:
            return True
        course = getattr(obj, "course", None)
        if course is None:
            # LessonProgress has obj.lesson.section.course
            lesson = getattr(obj, "lesson", None)
            if lesson is not None:
                course = lesson.section.course
        if course is None:
            return False
        return is_lms_instructor(request.user, course)
