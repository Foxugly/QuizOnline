from __future__ import annotations

from rest_framework import viewsets
from rest_framework.throttling import ScopedRateThrottle

from course.permissions import IsLmsInstructorOrReadOnly

from .models import Block
from .serializers import BlockSerializer
from .services import compact_blocks


class BlockViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = BlockSerializer

    def get_queryset(self):
        # ``select_related("target_content_type")`` keeps the ContentType
        # lookup cheap; the GFK target itself is resolved lazily on
        # access. Lesson-hosted blocks still walk to the parent course
        # for the visibility check via the ``related_query_name="lesson"``
        # alias declared on ``Lesson.blocks``.
        return (
            Block.objects.visible_to(self.request.user)
            .select_related("target_content_type")
        )

    def get_throttles(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            t = ScopedRateThrottle()
            t.scope = "lms_block_write"
            return [t]
        return []

    def perform_destroy(self, instance):
        # Capture the host before deletion so ``compact_blocks`` can
        # renumber its surviving siblings. Today the host is always a
        # Lesson; Phase 3 will extend ``compact_blocks`` to handle
        # Question / AnswerOption hosts.
        host = instance.target
        instance.delete()
        if host is not None:
            compact_blocks(lesson=host)
