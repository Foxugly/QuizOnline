from __future__ import annotations

from rest_framework import viewsets

from config.cache_mixins import ShortReadCacheMixin
from course.permissions import IsLmsInstructorOrReadOnly

from .models import Lesson
from .serializers import LessonDetailSerializer
from .services import compact_lessons


class LessonViewSet(ShortReadCacheMixin, viewsets.ModelViewSet):
    queryset = Lesson.objects.none()
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = LessonDetailSerializer

    def get_queryset(self):
        return (
            Lesson.objects.visible_to(self.request.user)
            .select_related("section", "section__course")
        )

    # Block reorder for lesson hosts now goes through the generic
    # ``POST /api/block/reorder/`` endpoint exposed by BlockViewSet,
    # so the per-host action that used to live here is gone — one
    # endpoint handles every host type.

    def perform_destroy(self, instance):
        section = instance.section
        instance.delete()
        compact_lessons(section=section)
