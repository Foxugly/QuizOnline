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
        # Capture the host AND the role before deletion so
        # ``compact_blocks`` can renumber surviving siblings within the
        # same role bucket. Phase 3: a Question can host two disjoint
        # block lists (prompt + explanation); compacting must stay
        # scoped to the deleted block's role.
        host = instance.target
        role = instance.block_role
        instance.delete()
        if host is not None:
            compact_blocks(lesson=host, block_role=role)
