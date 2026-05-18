from rest_framework.permissions import SAFE_METHODS, BasePermission

from config.permissions import is_authenticated_user, is_django_admin


def is_lms_instructor(user, course) -> bool:
    if not is_authenticated_user(user):
        return False
    if is_django_admin(user):
        return True
    return user.can_manage_domain(course.domain)


def is_lms_learner(user, course) -> bool:
    if not is_authenticated_user(user):
        return False
    domain = course.domain
    return (
        domain.owner_id == user.pk
        or domain.managers.filter(pk=user.pk).exists()
        or domain.members.filter(pk=user.pk).exists()
    )


def _course_of(obj):
    """Navigate any LMS object up to its Course parent."""
    from .models import ContentBlock, Course, Lesson, Section
    if isinstance(obj, Course):
        return obj
    if isinstance(obj, Section):
        return obj.course
    if isinstance(obj, Lesson):
        return obj.section.course
    if isinstance(obj, ContentBlock):
        return obj.lesson.section.course
    raise TypeError(f"_course_of: unsupported {type(obj).__name__}")


def _is_published_chain(obj) -> bool:
    from .models import ContentBlock, Lesson, Section
    course = _course_of(obj)
    if not course.is_published:
        return False
    if isinstance(obj, Section):
        return obj.is_published
    if isinstance(obj, Lesson):
        return obj.section.is_published and (obj.is_published or obj.is_preview)
    if isinstance(obj, ContentBlock):
        lesson = obj.lesson
        return lesson.section.is_published and (lesson.is_published or lesson.is_preview)
    return True  # Course: covered by course.is_published


class IsLmsInstructorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        course = _course_of(obj)
        if request.method in SAFE_METHODS:
            if is_lms_instructor(request.user, course):
                return True
            return is_lms_learner(request.user, course) and _is_published_chain(obj)
        return is_lms_instructor(request.user, course)
