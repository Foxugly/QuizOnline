from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import viewsets

from block.models import Block
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
        # The serializer surfaces translations + blocks (with their own
        # translations and a quiz_template FK) + the parent section /
        # course / domain (for can_manage, section_title,
        # available_lang_codes). Without this prefetch chain a single
        # retrieve fired ~12 queries — see the n+1 audit in commit
        # message context.
        return (
            Lesson.objects.visible_to(self.request.user)
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
    # ``POST /api/block/reorder/`` endpoint exposed by BlockViewSet,
    # so the per-host action that used to live here is gone — one
    # endpoint handles every host type.

    def perform_destroy(self, instance):
        section = instance.section
        instance.delete()
        compact_lessons(section=section)
