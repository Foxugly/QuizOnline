"""
Member-management slice of ``DomainViewSet``.

Three endpoints:
- ``POST /api/domain/{id}/member-role/`` — promote / demote / activate / remove a member.
- ``GET  /api/domain/moderation-summary/`` — per-user dashboard of moderable domains.
- ``POST /api/domain/{id}/leave/`` — voluntary self-leave.

The two ``_authorize_…`` helpers express the trust model: ``is_active``
is a global flag and needs strict guards, ``remove_member`` is scoped
to the domain but still refuses a few hostile cases. Both stay private
to the mixin.
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config.tools import ErrorDetailSerializer
from domain.models import Domain
from domain.serializers import (
    DomainMemberRoleSerializer,
    ModerationSummaryItemSerializer,
)
from domain.services import (
    domains_with_pending_for_user,
    invalidate_moderation_tile_for_users,
    record_audit,
)

from ._helpers import client_ip


class DomainMembersActionsMixin:
    """Adds the ``member-role``, ``moderation-summary`` and ``leave`` endpoints."""

    @extend_schema(
        tags=["Domain"],
        summary="Modifier le rôle d'un membre",
        description=(
            "Trois intentions exclusives selon le payload : "
            "``is_domain_manager`` (promouvoir / rétrograder), "
            "``is_active`` (toggle global avec garde-fous), "
            "``remove_member`` (retirer du domaine, scope local)."
        ),
        request=DomainMemberRoleSerializer,
        responses={status.HTTP_200_OK: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    )
    @action(detail=True, methods=["post"], url_path="member-role")
    def member_role(self, request, *args, **kwargs):
        domain = self.get_object()
        serializer = DomainMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        user_model = get_user_model()
        target = user_model.objects.filter(pk=validated["user_id"]).first()
        if not target:
            raise ValidationError({"user_id": "User not found."})

        if not domain.members.filter(pk=target.pk).exists() and domain.owner_id != target.pk:
            raise ValidationError({"user_id": "User must be linked to this domain first."})

        requester = request.user
        is_superuser = bool(getattr(requester, "is_superuser", False))

        with transaction.atomic():
            # --- Intent A: scoped removal from this domain only ---
            # Never touches User.is_active. The serializer guarantees this
            # branch is exclusive (no is_active / is_domain_manager combined).
            if validated.get("remove_member"):
                self._authorize_remove_member(
                    requester=requester, target=target, domain=domain, is_superuser=is_superuser
                )
                domain.managers.remove(target)
                domain.members.remove(target)
                target.refresh_from_db(fields=["is_active", "is_staff"])
                record_audit(
                    domain=domain,
                    action="member.remove",
                    actor=requester,
                    target_user=target,
                    metadata={"remote_addr": client_ip(request)},
                )
                # Removed user may have been a manager: drop their tile
                # entry so they do not keep seeing pending-request
                # counters they can no longer act on.
                transaction.on_commit(
                    lambda t=target.id: invalidate_moderation_tile_for_users([t])
                )
                return Response(
                    {
                        "id": target.id,
                        "username": target.username,
                        "is_active": target.is_active,
                        "is_staff": target.is_staff,
                        "is_domain_manager": False,
                        "is_member": False,
                    },
                    status=status.HTTP_200_OK,
                )

            update_fields: list[str] = []

            # --- Intent B: global account flag, strict guards ---
            if "is_active" in validated:
                self._authorize_is_active_change(
                    requester=requester, target=target, domain=domain, is_superuser=is_superuser
                )
                target.is_active = validated["is_active"]
                update_fields.append("is_active")

            # --- Intent C: domain-scoped manager flag ---
            if "is_domain_manager" in validated:
                # Promoting / demoting domain managers is owner-only (or
                # superuser). Peer managers cannot rearrange the leadership
                # of a domain — only the owner has that authority. This
                # avoids manager-coups and matches the same trust model as
                # ``Domain.owner`` itself.
                if not is_superuser and domain.owner_id != requester.id:
                    raise PermissionDenied(
                        "Seul le propriétaire du domaine peut modifier les rôles."
                    )
                make_manager = validated["is_domain_manager"]
                if make_manager:
                    domain.managers.add(target)
                    domain.members.add(target)
                    if is_superuser and not target.is_staff:
                        target.is_staff = True
                        update_fields.append("is_staff")
                    # Any pending join request gets flipped to approved with
                    # the pushing manager as the decider. Idempotent: zero
                    # affected rows when there is no pending request.
                    from domain.services import flip_pending_to_approved
                    flip_pending_to_approved(domain, target, by=requester)
                    record_audit(
                        domain=domain,
                        action="member.promote",
                        actor=requester,
                        target_user=target,
                        metadata={"remote_addr": client_ip(request)},
                    )
                else:
                    domain.managers.remove(target)
                    if (
                        is_superuser
                        and target.is_staff
                        and not target.is_superuser
                        and not target.managed_domains.exclude(pk=domain.pk).exists()
                    ):
                        target.is_staff = False
                        update_fields.append("is_staff")
                    record_audit(
                        domain=domain,
                        action="member.demote",
                        actor=requester,
                        target_user=target,
                        metadata={"remote_addr": client_ip(request)},
                    )
                    # Demoted manager may no longer moderate: drop their
                    # tile entry now instead of waiting for the TTL.
                    transaction.on_commit(
                        lambda t=target.id: invalidate_moderation_tile_for_users([t])
                    )

            if update_fields:
                target.save(update_fields=update_fields)

        if "is_domain_manager" in validated:
            is_domain_manager = validated["is_domain_manager"]
        else:
            is_domain_manager = domain.managers.filter(pk=target.pk).exists()
        return Response(
            {
                "id": target.id,
                "username": target.username,
                "is_active": target.is_active,
                "is_staff": target.is_staff,
                "is_domain_manager": is_domain_manager,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _authorize_is_active_change(*, requester, target, domain, is_superuser: bool) -> None:
        """
        Toggling ``User.is_active`` is a global operation: it locks/unlocks the
        account on the entire platform, not just on this domain. Allow only
        when the requester is a superuser, or when **all** of these hold:

        - the target is not a superuser;
        - the target is not the owner of this domain;
        - the target is not another manager of this domain (managers cannot
          deactivate their peers);
        - the target is not the requester themselves (no self-lockout);
        - the target is **exclusively** in this domain (no other membership,
          ownership, or manager role on any other domain).

        The last rule is the core of the model: a manager only has global
        authority over a user if they de facto control that user's whole
        footprint on the platform.
        """
        if is_superuser:
            return
        if getattr(target, "is_superuser", False):
            raise PermissionDenied("Vous ne pouvez pas désactiver un superuser.")
        if target.pk == domain.owner_id:
            raise PermissionDenied("Vous ne pouvez pas désactiver le owner du domaine.")
        if target.pk == requester.pk:
            raise PermissionDenied("Vous ne pouvez pas vous désactiver vous-même.")
        if domain.managers.filter(pk=target.pk).exists():
            raise PermissionDenied("Vous ne pouvez pas désactiver un autre manager du domaine.")

        other_link = (
            Domain.objects
            .filter(Q(members=target) | Q(owner=target) | Q(managers=target))
            .exclude(pk=domain.pk)
            .exists()
        )
        if other_link:
            raise PermissionDenied(
                "L'utilisateur appartient à d'autres domaines — seul un superuser peut "
                "désactiver son compte globalement."
            )

    @staticmethod
    def _authorize_remove_member(*, requester, target, domain, is_superuser: bool) -> None:
        """
        Removing a user from a domain is scoped, but we still refuse a few
        nonsensical or hostile cases. Superusers bypass the peer/owner checks
        because they may legitimately need to clean up.
        """
        if target.pk == domain.owner_id:
            raise PermissionDenied("Le owner d'un domaine ne peut pas en être retiré.")
        if is_superuser:
            return
        if target.pk == requester.pk:
            raise PermissionDenied("Vous ne pouvez pas vous retirer vous-même du domaine.")
        if domain.managers.filter(pk=target.pk).exists():
            raise PermissionDenied("Un manager ne peut pas en retirer un autre.")

    @extend_schema(
        tags=["Domain"],
        summary="Tableau de bord modération : domaines avec demandes en attente",
        description=(
            "Pour l'utilisateur connecté, renvoie la liste des domaines qu'il "
            "peut modérer et qui ont au moins une demande d'adhésion en "
            "attente. Trié par nombre de demandes décroissant.\n\n"
            "Endpoint volontairement léger (aucune action), pensé pour une "
            "tuile d'accueil."
        ),
        responses={
            status.HTTP_200_OK: ModerationSummaryItemSerializer(many=True),
        },
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="moderation-summary",
        permission_classes=[IsAuthenticated],
        # Explicitly disable pagination on this action: we return a small
        # list (one item per moderable domain with pending requests) and
        # never need pagination. Without this, the viewset's default
        # pagination class would prompt drf-spectacular to advertise a
        # ``Paginated...`` response shape that diverges from what we
        # actually return.
        pagination_class=None,
    )
    def moderation_summary(self, request, *args, **kwargs):
        return Response(domains_with_pending_for_user(request.user))

    @extend_schema(
        tags=["Domain"],
        summary="Quitter le domaine (action volontaire de l'utilisateur)",
        description=(
            "L'utilisateur connecté se retire du domaine. Refuse :\n\n"
            "- si l'utilisateur est le owner (il doit d'abord transférer la propriété) ;\n"
            "- si l'utilisateur n'est pas membre du domaine.\n\n"
            "Tout statut de manager est aussi retiré. Idempotent au niveau\n"
            "du M2M (`remove` sur un non-membre est un no-op)."
        ),
        request=None,
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Quitté."),
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_409_CONFLICT: ErrorDetailSerializer,
        },
    )
    @action(detail=True, methods=["post"], url_path="leave", permission_classes=[IsAuthenticated])
    def leave(self, request, *args, **kwargs):
        domain = self.get_object()
        user = request.user
        if domain.owner_id == user.id:
            return Response(
                {"detail": "owner_cannot_leave"},
                status=status.HTTP_409_CONFLICT,
            )
        if not domain.members.filter(pk=user.pk).exists():
            return Response(
                {"detail": "not_a_member"},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            domain.managers.remove(user)
            domain.members.remove(user)
            record_audit(
                domain=domain,
                action="member.self_leave",
                actor=user,
                target_user=user,
                metadata={"remote_addr": client_ip(request)},
            )
            # A self-leaving manager loses their moderation rights on
            # this domain: drop their tile entry on commit.
            transaction.on_commit(
                lambda uid=user.id: invalidate_moderation_tile_for_users([uid])
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
