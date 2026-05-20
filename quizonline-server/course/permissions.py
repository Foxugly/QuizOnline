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
    from block.models import Block
    from lesson.models import Lesson
    from .models import Course, Section
    if isinstance(obj, Course):
        return obj
    if isinstance(obj, Section):
        return obj.course
    if isinstance(obj, Lesson):
        return obj.section.course
    if isinstance(obj, Block):
        # Polymorphic block — walk the GFK to the host. The host is
        # either a Lesson (block-builder LMS payloads) or a Question /
        # AnswerOption (Phase 3.5 question editor). Question hosts
        # carry no Course parent — they hang off a Domain directly —
        # so this helper returns ``None`` in that case and the caller
        # falls back to the domain-scoped permission check.
        host = obj.target
        if isinstance(host, Lesson):
            return host.section.course
        from question.models import AnswerOption, Question
        if isinstance(host, (Question, AnswerOption)):
            return None
        raise TypeError(
            f"_course_of: Block with unsupported host {type(host).__name__}"
        )
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
    from block.models import Block
    from lesson.models import Lesson
    from .models import Section
    course = _course_of(obj)
    # Question / AnswerOption-hosted blocks have no Course parent —
    # they belong directly to a Domain. There's no "published" gate
    # for those, so surface them as visible to anyone with read
    # access at the IsLmsInstructorOrReadOnly layer.
    if course is None:
        return True
    if not course.is_published:
        return False
    if isinstance(obj, Section):
        return obj.is_published
    if isinstance(obj, Lesson):
        return obj.section.is_published and (obj.is_published or obj.is_preview)
    if isinstance(obj, Block):
        host = obj.target
        if isinstance(host, Lesson):
            return host.section.is_published and (host.is_published or host.is_preview)
        return True
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
        # Block: lesson, LessonQuiz: course / lesson) and require
        # instructor rights on it.
        if getattr(view, "action", None) == "create":
            return _can_create(request.user, request.data)
        return True  # detail-route writes are gated by has_object_permission

    def has_object_permission(self, request, view, obj):
        course = _course_of(obj)
        if course is None:
            # Question / AnswerOption-hosted Block (Phase 3.5): no
            # Course parent — fall back to the host's Question.domain.
            return _has_question_block_permission(request, obj)
        if request.method in SAFE_METHODS:
            if is_lms_instructor(request.user, course):
                return True
            return is_lms_learner(request.user, course) and _is_published_chain(obj)
        return is_lms_instructor(request.user, course)


def _has_question_block_permission(request, obj) -> bool:
    """Resolve the domain that owns a Question / AnswerOption-hosted
    Block and check whether the caller may read or write it.

    Read access: any authenticated user (Questions are domain-scoped,
    not globally visible, but the block read path is gated by the
    question/answer-option list endpoints already; the block detail
    endpoint mirrors that posture and lets anyone see the payload of a
    block they could already fetch through the parent question).

    Write access: domain manager (superuser, owner, manager).
    """
    from block.models import Block
    from question.models import AnswerOption, Question
    if not isinstance(obj, Block):
        return False
    host = obj.target
    if isinstance(host, Question):
        domain = host.domain
    elif isinstance(host, AnswerOption):
        domain = host.question.domain
    else:
        return False
    user = request.user
    if request.method in SAFE_METHODS:
        return is_authenticated_user(user)
    if is_django_admin(user):
        return True
    return bool(user and user.can_manage_domain(domain))


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

    # Phase 3.5 question editor: blocks may now be hosted by a Question
    # (prompt / explanation) or an AnswerOption. Both ladder up to a
    # Domain — domain managers (owner, manager, superuser) may create.
    question_id = data.get("question")
    if question_id:
        from question.models import Question
        q = Question.objects.filter(pk=question_id).select_related("domain").first()
        return bool(q and user.can_manage_domain(q.domain))

    answer_option_id = data.get("answer_option")
    if answer_option_id:
        from question.models import AnswerOption
        opt = AnswerOption.objects.filter(pk=answer_option_id).select_related("question__domain").first()
        return bool(opt and user.can_manage_domain(opt.question.domain))

    # No resolvable parent reference => deny create (DRF will return 403).
    return False
