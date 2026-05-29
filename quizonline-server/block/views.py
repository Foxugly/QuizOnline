from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from course.permissions import IsLmsInstructorOrReadOnly

from .models import Block
from .serializers import BlockSerializer
from .services import compact_blocks, reorder_blocks


# Host types that can carry a block list. Kept inline as a frozen set so
# the reorder endpoint can reject anything else without an extra round
# trip to ContentType.
_REORDER_HOSTS = {
    "lesson": ("lesson", "lesson"),
    "question": ("question", "question"),
    "answer_option": ("question", "answeroption"),
}


class _BlockReorderRequest(serializers.Serializer):
    """Wire shape of the generic bulk-reorder endpoint."""
    host_type = serializers.ChoiceField(choices=list(_REORDER_HOSTS.keys()))
    host_id = serializers.IntegerField(min_value=1)
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    block_role = serializers.ChoiceField(
        choices=[Block.ROLE_BODY, Block.ROLE_PROMPT, Block.ROLE_EXPLANATION],
        required=False, default=Block.ROLE_BODY,
    )


class BlockViewSet(viewsets.ModelViewSet):
    queryset = Block.objects.none()
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

    @extend_schema(
        request=_BlockReorderRequest,
        responses={status.HTTP_200_OK: BlockSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Atomic bulk reorder for any block host.

        Body shape: ``{host_type, host_id, ids, block_role}``.
        ``host_type`` is one of ``lesson`` / ``question`` /
        ``answer_option``; ``block_role`` defaults to ``body`` and is
        only consequential when the host can hold multiple disjoint
        block lists (Question splits into ``prompt`` + ``explanation``).

        Replaces three host-specific endpoints from earlier phases by a
        single source of truth — the frontend
        ``<app-block-list-editor>`` calls this once regardless of host.
        The two-phase reorder primitive in ``block.services`` already
        accepts any host via the polymorphic ``_host_filter`` helper, so
        this view just resolves the host instance + checks write
        permission and delegates.
        """
        payload = _BlockReorderRequest(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        app_label, model_name = _REORDER_HOSTS[data["host_type"]]
        try:
            ct = ContentType.objects.get(app_label=app_label, model=model_name)
            host = ct.get_object_for_this_type(pk=data["host_id"])
        except ContentType.DoesNotExist as exc:
            raise ValidationError({"host_type": "Unknown host type."}) from exc
        except Exception as exc:  # noqa: BLE001
            raise ValidationError({"host_id": "Host not found."}) from exc

        # Permission: a representative block from the host gives the
        # DRF permission class enough context to walk through
        # ``_course_of`` / ``_has_question_block_permission``.
        sample = (
            Block.objects.filter(target_content_type=ct, target_object_id=host.id)
            .first()
        )
        if sample is None:
            raise ValidationError({"ids": "Host has no blocks to reorder."})
        self.check_object_permissions(request, sample)

        # Sanity: every id in the payload must belong to the host's
        # block list with the requested role — refuse the call
        # otherwise so a caller can never re-number blocks across
        # hosts or roles by accident.
        scoped = (
            Block.objects.filter(
                target_content_type=ct, target_object_id=host.id,
                block_role=data["block_role"],
            )
            .values_list("id", flat=True)
        )
        scoped_set = set(scoped)
        if set(data["ids"]) != scoped_set:
            raise ValidationError({
                "ids": "Block ids must match the host's blocks for that role exactly.",
            })

        reorder_blocks(
            lesson=host,  # kept named ``lesson`` for now — services helper accepts any host
            block_ids_in_order=data["ids"],
            block_role=data["block_role"],
        )
        # Return the freshly-reordered list so the client can refresh
        # without a second GET.
        refreshed = list(
            Block.objects.filter(
                target_content_type=ct, target_object_id=host.id,
                block_role=data["block_role"],
            ).order_by("order")
        )
        return Response(BlockSerializer(refreshed, many=True).data)
