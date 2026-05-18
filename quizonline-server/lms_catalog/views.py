from __future__ import annotations

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from rest_framework.exceptions import PermissionDenied

from .models import ContentBlock, Course, CourseAuditLog, Lesson, Section
from .permissions import IsLmsInstructorOrReadOnly, is_lms_instructor
from .serializers import (
    ContentBlockSerializer,
    CourseAuditLogSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseWriteSerializer,
    LessonDetailSerializer,
    SectionSerializer,
)
from .services import (
    clone_course,
    compact_blocks,
    compact_lessons,
    compact_sections,
    export_course_to_dict,
    import_course_from_dict,
    publish_course,
    reorder_blocks,
    reorder_lessons,
    reorder_sections,
    unpublish_course,
)


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["translations__title", "translations__description", "slug"]
    ordering_fields = ["published_at", "created_at", "level"]
    lookup_field = "pk"

    def get_queryset(self):
        qs = (
            Course.objects.visible_to(self.request.user)
            .select_related("domain", "language")
            .prefetch_related("translations")
        )
        # Optional ``?domain=<id>`` / ``?level=<level>`` query filters
        # power the catalog's domain + level dropdowns. Invalid values
        # silently degrade to an empty queryset slice rather than
        # erroring out, since the params come from a UI picker that
        # only ever feeds in known values.
        domain_id = self.request.query_params.get("domain")
        if domain_id:
            try:
                qs = qs.filter(domain_id=int(domain_id))
            except (TypeError, ValueError):
                qs = qs.none()
        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CourseWriteSerializer
        return CourseDetailSerializer

    def list(self, request, *args, **kwargs):
        """Override the default list flow to pre-aggregate the cards'
        meta (lesson count, total duration) on the DB side and to
        bulk-fetch the caller's enrollment / progress / lesson-
        completion state in a fixed number of queries — irrespective
        of the number of courses returned. Without this, the previous
        ``SerializerMethodField`` pattern issued ~5 queries per course,
        producing a quadratic blow-up on multi-course domains.

        Ordering is pinned to ``(-published_at, -created_at, -id)``
        so paginator slicing is deterministic — without an explicit
        secondary tie-breaker DRF emits an ``UnorderedObjectList``
        warning and consecutive pages may shuffle rows on courses
        that share the same publish timestamp.
        """
        qs = (
            self.filter_queryset(self.get_queryset())
            .annotate(
                lesson_count_db=Count("sections__lessons", distinct=True),
                total_duration_db=Coalesce(Sum("sections__lessons__estimated_duration"), 0),
            )
            .order_by("-published_at", "-created_at", "-id")
        )
        page = self.paginate_queryset(qs)
        courses = page if page is not None else list(qs)
        context = self._build_my_enrollment_context(
            request, [c.id for c in courses]
        )
        serializer = self.get_serializer(courses, many=True)
        # ``get_serializer`` already wired the standard context; layer
        # the bulk-fetched lookups on top so ``CourseListSerializer``
        # can short-circuit its per-row queries.
        serializer.context.update(context)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def _build_my_enrollment_context(self, request, course_ids: list[int]) -> dict:
        """Pre-fetch in 4 queries (one per related table) everything
        ``CourseListSerializer.get_my_enrollment`` needs for the whole
        page. Returns a context dict keyed by the same shape the
        serializer expects."""
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False) or not course_ids:
            return {
                "_enrollments_by_course": {},
                "_progresses_by_course": {},
                "_lessons_by_course": {},
                "_completed_lessons": set(),
            }
        # Lazy imports to avoid circulars at module load.
        from lms_enrollment.models import CourseEnrollment, CourseProgress, LessonProgress

        enrollments_by_course = {
            e.course_id: e
            for e in CourseEnrollment.objects.filter(user=user, course_id__in=course_ids)
        }
        progresses_by_course = {
            p.course_id: p
            for p in CourseProgress.objects.filter(user=user, course_id__in=course_ids)
        }
        lessons_by_course: dict[int, list[int]] = {}
        for lid, cid in (
            Lesson.objects.filter(section__course_id__in=course_ids)
            .order_by("section__order", "order", "id")
            .values_list("id", "section__course_id")
        ):
            lessons_by_course.setdefault(cid, []).append(lid)
        completed_lessons = set(
            LessonProgress.objects.filter(
                user=user,
                lesson_id__in=[lid for ids in lessons_by_course.values() for lid in ids],
                is_completed=True,
            ).values_list("lesson_id", flat=True)
        )
        return {
            "_enrollments_by_course": enrollments_by_course,
            "_progresses_by_course": progresses_by_course,
            "_lessons_by_course": lessons_by_course,
            "_completed_lessons": completed_lessons,
        }

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[^/]+)")
    def by_slug(self, request, slug=None):
        course = self.get_queryset().filter(slug=slug).first()
        if not course:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        publish_course(course=course, by_user=request.user)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        unpublish_course(course=course, by_user=request.user)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        source = self.get_object()
        new = clone_course(source=source, by_user=request.user)
        return Response(
            CourseDetailSerializer(new, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="export")
    def export_json(self, request, pk=None):
        """Return the full course (structure + translations) as a
        JSON-serialisable dict the operator can save and re-import.
        Instructor-gated so a learner doesn't end up exfiltrating
        unpublished course content. Media + quiz FKs are dropped by
        the exporter — see ``export_course_to_dict``."""
        course = self.get_object()
        if not is_lms_instructor(request.user, course):
            raise PermissionDenied()
        return Response(export_course_to_dict(course=course))

    @action(detail=False, methods=["post"], url_path="import")
    def import_json(self, request):
        """Re-create a course from an export payload into a
        caller-specified domain (or the caller's current domain when
        ``target_domain_id`` is absent). The caller must be an
        instructor of the target domain — the same gate that protects
        manual create."""
        from domain.models import Domain
        from .permissions import _can_create  # reuse the create-permission logic

        payload = request.data.get("payload")
        target_domain_id = request.data.get("target_domain_id")
        if target_domain_id is None:
            user_domain = getattr(request.user, "current_domain_id", None)
            target_domain_id = user_domain
        target_domain = Domain.objects.filter(pk=target_domain_id).first()
        if not target_domain:
            return Response({"detail": "Unknown target domain."}, status=status.HTTP_400_BAD_REQUEST)
        if not _can_create(request.user, {"domain": target_domain_id}):
            raise PermissionDenied()
        try:
            new_course = import_course_from_dict(
                payload=payload, target_domain=target_domain, by_user=request.user,
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CourseDetailSerializer(new_course, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="audit-log")
    def audit_log(self, request, pk=None):
        """Read-only audit trail of administrative actions on the
        course (publish / unpublish / clone / …). Instructor-gated so
        a learner never gets to see who took which decision when."""
        course = self.get_object()
        if not is_lms_instructor(request.user, course):
            raise PermissionDenied()
        rows = CourseAuditLog.objects.filter(course=course).select_related("actor")[:100]
        return Response(CourseAuditLogSerializer(rows, many=True).data)

    @action(detail=True, methods=["post"], url_path="section/reorder")
    def reorder_sections_action(self, request, pk=None):
        course = self.get_object()
        ids = request.data.get("ids", [])
        reorder_sections(course=course, section_ids_in_order=ids)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)


class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = SectionSerializer

    def get_queryset(self):
        return Section.objects.visible_to(self.request.user).select_related("course")

    @action(detail=True, methods=["post"], url_path="lesson/reorder")
    def reorder_lessons_action(self, request, pk=None):
        section = self.get_object()
        ids = request.data.get("ids", [])
        reorder_lessons(section=section, lesson_ids_in_order=ids)
        return Response(SectionSerializer(section).data)

    def perform_destroy(self, instance):
        course = instance.course
        instance.delete()
        compact_sections(course=course)


class LessonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = LessonDetailSerializer

    def get_queryset(self):
        return (
            Lesson.objects.visible_to(self.request.user)
            .select_related("section", "section__course")
        )

    @action(detail=True, methods=["post"], url_path="block/reorder")
    def reorder_blocks_action(self, request, pk=None):
        lesson = self.get_object()
        ids = request.data.get("ids", [])
        reorder_blocks(lesson=lesson, block_ids_in_order=ids)
        return Response(LessonDetailSerializer(lesson).data)

    def perform_destroy(self, instance):
        section = instance.section
        instance.delete()
        compact_lessons(section=section)


class ContentBlockViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = ContentBlockSerializer

    def get_queryset(self):
        return (
            ContentBlock.objects.visible_to(self.request.user)
            .select_related("lesson", "lesson__section", "lesson__section__course")
        )

    def get_throttles(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            t = ScopedRateThrottle()
            t.scope = "lms_block_write"
            return [t]
        return []

    def perform_destroy(self, instance):
        lesson = instance.lesson
        instance.delete()
        compact_blocks(lesson=lesson)
