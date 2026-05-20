from __future__ import annotations

from rest_framework import viewsets
from rest_framework.throttling import ScopedRateThrottle

from course.permissions import IsLmsInstructorOrReadOnly

from .models import ContentBlock
from .serializers import ContentBlockSerializer
from .services import compact_blocks


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
