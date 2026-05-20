from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from course.permissions import IsLmsInstructorOrReadOnly

from .models import Lesson
from .serializers import LessonDetailSerializer
from .services import compact_lessons


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
        from block.services import reorder_blocks
        lesson = self.get_object()
        ids = request.data.get("ids", [])
        reorder_blocks(lesson=lesson, block_ids_in_order=ids)
        return Response(LessonDetailSerializer(lesson).data)

    def perform_destroy(self, instance):
        section = instance.section
        instance.delete()
        compact_lessons(section=section)
