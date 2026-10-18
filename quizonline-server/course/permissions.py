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


# Payload keys that name the parent an LMS object is created under, with
# the model each one references. ``domain`` is the Course parent; the
# others ladder up to a Course (or, for question-editor blocks, a Domain).
_CREATE_PARENT_KEYS = ("domain", "course", "section", "lesson", "question", "answer_option")


def _parent_model(key):
    from domain.models import Domain
    from lesson.models import Lesson
    from question.models import AnswerOption, Question

    from .models import Course, Section
    return {
        "domain": Domain, "course": Course, "section": Section,
        "lesson": Lesson, "question": Question, "answer_option": AnswerOption,
    }[key]


def can_write_under(user, parent) -> bool:
    """Whether ``user`` may create content under — or attach content to —
    ``parent`` (a Domain, Course, Section, Lesson, Question or
    AnswerOption). Instructor rights = superuser, or owner / manager of
    the domain the parent belongs to."""
    from domain.models import Domain
    from lesson.models import Lesson
    from question.models import AnswerOption, Question

    from .models import Course, Section
    if not is_authenticated_user(user):
        return False
    if is_django_admin(user):
        return True
    if isinstance(parent, Domain):
        domain = parent
    elif isinstance(parent, Course):
        domain = parent.domain
    elif isinstance(parent, Section):
        domain = parent.course.domain
    elif isinstance(parent, Lesson):
        domain = parent.section.course.domain
    elif isinstance(parent, Question):
        domain = parent.domain
    elif isinstance(parent, AnswerOption):
        domain = parent.question.domain
    else:
        raise TypeError(f"can_write_under: unsupported parent {type(parent).__name__}")
    return bool(user.can_manage_domain(domain))


def _can_create(user, data) -> bool:
    """Resolve every parent reference in the POST data and return whether
    ``user`` is an instructor (owner / manager / superuser) for ALL of them.

    Every parent key present must pass — a payload naming one parent the
    caller manages (e.g. ``domain``) and another they do not (the
    ``course`` / ``section`` / ``lesson`` the serializer actually uses)
    is denied. The serializers re-check the validated target through
    :class:`ParentScopedWriteMixin`."""
    if is_django_admin(user):
        return True
    found = False
    for key in _CREATE_PARENT_KEYS:
        value = data.get(key) if hasattr(data, "get") else None
        if value in (None, ""):
            continue
        found = True
        try:
            parent = _parent_model(key).objects.filter(pk=value).first()
        except (TypeError, ValueError):
            return False
        if parent is None or not can_write_under(user, parent):
            return False
    # No resolvable parent reference => deny create (DRF will return 403).
    return found


class ParentScopedWriteMixin:
    # Serializer mixin guarding the parent foreign keys of LMS content.
    #
    # ``parent_fields`` lists the serializer fields that attach the object
    # to its tenant (``course`` for a Section, ``section`` for a Lesson, ...).
    # For each one present in the validated data:
    #
    # - on **create**, the caller must be an instructor of the target parent
    #   (403 otherwise) — the permission class already checks the raw
    #   payload, this re-checks the instance the serializer will really use;
    # - on **update**, the value must equal the current parent (400
    #   otherwise). Re-parenting is not a PATCH feature: lessons move
    #   between sections of the same course through ``/lesson/{id}/move/``,
    #   and order changes go through the ``reorder`` actions.
    #
    # Runs in ``to_internal_value`` so a subclass overriding ``validate``
    # cannot skip it.
    # (Comment, not a docstring: drf-spectacular would copy a docstring
    # into the description of every serializer schema using the mixin.)

    parent_fields: tuple[str, ...] = ()

    def to_internal_value(self, data):
        from django.utils.translation import gettext as _
        from rest_framework import serializers
        from rest_framework.exceptions import PermissionDenied

        attrs = super().to_internal_value(data)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        errors = {}
        for name in self.parent_fields:
            if name not in attrs:
                continue
            target = attrs[name]
            if self.instance is not None:
                current = self.fields[name].get_attribute(self.instance)
                if getattr(current, "pk", current) != getattr(target, "pk", target):
                    errors[name] = [_("This field cannot be changed after creation.")]
            elif target is not None and request is not None and not can_write_under(user, target):
                raise PermissionDenied(_("You do not have permission to add content here."))
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
