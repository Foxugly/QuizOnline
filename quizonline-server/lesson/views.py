from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from block.models import Block
from config.cache_mixins import ShortReadCacheMixin
from course.models import Section
from course.permissions import IsLmsInstructorOrReadOnly
from course.serializers import SectionSerializer

from .models import Lesson
from .serializers import (
    LessonDetailSerializer,
    LessonMoveSerializer,
    LessonSummarySerializer,
)
from .services import compact_lessons, move_lesson, publish_lesson, unpublish_lesson


class LessonViewSet(ShortReadCacheMixin, viewsets.ModelViewSet):
    queryset = Lesson.objects.none()
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = LessonDetailSerializer

    def get_queryset(self):
        # The serializer surfaces translations + blocks (with their own
        # translations and a quiz_template FK) + the parent section /
        # course / domain (for can_manage, section_title,
        # available_lang_codes). Without this prefetch chain a single
        # retrieve fired ~12 queries — see the n+1 audit in commit
        # message context.
        # The list ships every lesson's blocks, so it only holds lessons
        # whose content the caller may read. Detail routes resolve on
        # plain visibility: a lesson the learner can see in the outline
        # but may not read yet answers 403 ``enrollment_required`` from
        # the permission class (not a 404), so the SPA can offer to enroll.
        user = self.request.user
        base = (
            Lesson.objects.content_readable_by(user)
            if self.action == "list"
            else Lesson.objects.visible_to(user)
        )
        return (
            base
            .select_related("section", "section__course", "section__course__domain")
            .prefetch_related(
                "translations",
                "section__translations",
                "section__course__domain__allowed_languages",
                Prefetch(
                    "blocks",
                    queryset=Block.objects
                        .select_related("quiz_template")
                        .prefetch_related("translations"),
                ),
            )
        )

    # Block reorder for lesson hosts now goes through the generic
    # ``POST /api/v1/block/reorder/`` endpoint exposed by BlockViewSet,
    # so the per-host action that used to live here is gone — one
    # endpoint handles every host type.

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        lesson = self.get_object()
        publish_lesson(lesson=lesson, by_user=request.user)
        return Response(LessonDetailSerializer(lesson, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        lesson = self.get_object()
        unpublish_lesson(lesson=lesson, by_user=request.user)
        return Response(LessonDetailSerializer(lesson, context={"request": request}).data)

    @extend_schema(
        request=LessonMoveSerializer,
        responses=inline_serializer(
            name="LessonMoveResult",
            fields={
                "lesson": LessonSummarySerializer(),
                "source_section": SectionSerializer(),
                "target_section": SectionSerializer(),
            },
        ),
    )
    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        lesson = self.get_object()  # object permission: instructor only for writes
        payload = LessonMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        target = Section.objects.filter(
            pk=payload.validated_data["section"], course_id=lesson.section.course_id
        ).first()
        if target is None:
            raise serializers.ValidationError({"section": _("Unknown section.")})
        source_id = lesson.section_id
        try:
            lesson = move_lesson(lesson=lesson, section=target, position=payload.validated_data["position"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"section": exc.messages}) from exc
        ctx = {"request": request}
        return Response({
            "lesson": LessonSummarySerializer(lesson, context=ctx).data,
            "source_section": SectionSerializer(Section.objects.get(pk=source_id), context=ctx).data,
            "target_section": SectionSerializer(target, context=ctx).data,
        })

    def perform_destroy(self, instance):
        section = instance.section
        instance.delete()
        compact_lessons(section=section)
