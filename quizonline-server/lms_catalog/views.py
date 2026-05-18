from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import ContentBlock, Course, Lesson, Section
from .permissions import IsLmsInstructorOrReadOnly
from .serializers import (
    ContentBlockSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseWriteSerializer,
    LessonDetailSerializer,
    SectionSerializer,
)
from .services import (
    clone_course,
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
