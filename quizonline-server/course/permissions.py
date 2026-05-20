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
    from block.models import ContentBlock
    from lesson.models import Lesson
    from .models import Course, Section
    if isinstance(obj, Course):
        return obj
    if isinstance(obj, Section):
        return obj.course
    if isinstance(obj, Lesson):
        return obj.section.course
    if isinstance(obj, ContentBlock):
        return obj.lesson.section.course
    # Lazy import to avoid catalog -> assessment cycle at module load.
    try:
        from assessment.models import LessonQuiz
        if isinstance(obj, LessonQuiz):
            if obj.lesson_id:
                return obj.lesson.section.course
            return obj.course
    except ImportError:
        pass
    raise TypeError(f"_course_of: unsupported {type(obj).__name__}")


def _is_published_chain(obj) -> bool:
    from block.models import ContentBlock
    from lesson.models import Lesson
    from .models import Section
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
        if not is_authenticated_user(request.user):
            return False
        # Read methods: pass through to has_object_permission for object access.
        if request.method in SAFE_METHODS:
            return True
        # Create on a list endpoint (no object yet): infer the parent course
        # from the payload (Course: domain, Section: course, Lesson: section,
        # ContentBlock: lesson, LessonQuiz: course / lesson) and require
        # instructor rights on it.
        if getattr(view, "action", None) == "create":
            return _can_create(request.user, request.data)
        return True  # detail-route writes are gated by has_object_permission

    def has_object_permission(self, request, view, obj):
        course = _course_of(obj)
        if request.method in SAFE_METHODS:
            if is_lms_instructor(request.user, course):
                return True
            return is_lms_learner(request.user, course) and _is_published_chain(obj)
        return is_lms_instructor(request.user, course)


def _can_create(user, data) -> bool:
    """Resolve the target course/domain from POST data and return whether
    ``user`` is an instructor (owner / manager / superuser) for it."""
    if is_django_admin(user):
        return True
    # Lazy imports to avoid circulars at module load.
    from domain.models import Domain
    from lesson.models import Lesson
    from .models import Course, Section

    domain_id = data.get("domain")
    if domain_id:
        domain = Domain.objects.filter(pk=domain_id).first()
        return bool(domain and user.can_manage_domain(domain))

    course_id = data.get("course")
    if course_id:
        course = Course.objects.filter(pk=course_id).first()
        return bool(course and is_lms_instructor(user, course))

    section_id = data.get("section")
    if section_id:
        section = Section.objects.filter(pk=section_id).select_related("course").first()
        return bool(section and is_lms_instructor(user, section.course))

    lesson_id = data.get("lesson")
    if lesson_id:
        lesson = Lesson.objects.filter(pk=lesson_id).select_related("section__course").first()
        return bool(lesson and is_lms_instructor(user, lesson.section.course))

    # No resolvable parent reference => deny create (DRF will return 403).
    return False
