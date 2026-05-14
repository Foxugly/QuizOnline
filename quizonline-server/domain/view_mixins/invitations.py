"""
Invitations slice of ``DomainViewSet``.

Four endpoints:
- ``POST   /api/domain/{id}/invite/`` — multi-email + multi-domain bulk invite (rate-limited).
- ``GET    /api/domain/{id}/invitations/`` — pending invitations.
- ``POST   /api/domain/{id}/invitations/{invite_id}/resend/``
- ``POST   /api/domain/{id}/invitations/{invite_id}/revoke/``

The fan-out throttle (``_DomainInviteThrottle``) used by ``invite`` is
defined here too: when the caller fans out to multiple domains we
switch to the much tighter ``domain_invite_fanout`` bucket so a single
hit cannot multiply the per-hour mail volume by the fan-out factor.
"""
from django.contrib.auth import get_user_model
from django.db.models.functions import Lower
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404 as drf_get_object_or_404
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

from config.tools import ErrorDetailSerializer
from core.mailers.domain_invite import send_domain_invite_email
from domain.models import Domain, DomainInvite
from domain.permissions import IsDomainOwnerOrManager
from domain.serializers import (
    DomainInviteReadSerializer,
    DomainInviteRequestSerializer,
    DomainInviteResultSerializer,
)
from domain.services import record_audit, upsert_invite

from ._helpers import client_ip


class _DomainInviteThrottle(ScopedRateThrottle):
    """
    ScopedRateThrottle preconfigured with the ``domain_invite`` scope.
    Avoids the awkward dance of setting ``throttle_scope`` on the action
    function attribute, which DRF's ``@action`` does not pass through to
    ``as_view``. We pin the scope in :meth:`allow_request` so it does
    not need to come from the view object.

    When the caller fans out the invitation to several domains
    (``additional_domain_ids`` non-empty), switch to the much tighter
    ``domain_invite_fanout`` bucket — a single hit on this path can
    send up to ``len(emails) × (1 + len(extras))`` mails, so reusing
    the per-hit budget of the single-domain bucket would multiply the
    real per-hour mail volume by the fan-out factor.
    """

    def allow_request(self, request, view):
        self.scope = (
            "domain_invite_fanout"
            if self._is_fanout(request)
            else "domain_invite"
        )
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        # ``BaseThrottle.allow_request`` is overridden by ``SimpleRateThrottle``
        # (the parent of ScopedRateThrottle) — call it skipping
        # ScopedRateThrottle which would otherwise look up the scope on the
        # view object.
        return SimpleRateThrottle.allow_request(self, request, view)

    @staticmethod
    def _is_fanout(request) -> bool:
        try:
            data = request.data
        except Exception:
            return False
        if not isinstance(data, dict):
            return False
        extras = data.get("additional_domain_ids") or []
        return bool(extras)


class DomainInvitationsActionsMixin:
    # See ``audit.py`` for why this mixin intentionally has no class
    # docstring (drf-spectacular fallback rules).

    @extend_schema(
        tags=["Domain"],
        summary="Inviter un ou plusieurs utilisateurs par e-mail",
        description=(
            "Envoie une invitation signée à chaque adresse de la liste. Le "
            "destinataire suivra un lien qui pointe sur la page d'acceptation "
            "frontend ; aucun objet d'invitation n'est créé côté DB (le token "
            "est l'invitation).\n\n"
            "Accessible aux owners et aux managers du domaine."
        ),
        request=DomainInviteRequestSerializer,
        responses={status.HTTP_200_OK: DomainInviteResultSerializer(many=True)},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="invite",
        pagination_class=None,
        throttle_classes=[_DomainInviteThrottle],
    )
    def invite(self, request, *args, **kwargs):
        domain = self.get_object()
        serializer = DomainInviteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emails = serializer.validated_data["emails"]
        language = serializer.validated_data["language"]
        additional_ids = serializer.validated_data.get("additional_domain_ids") or []

        # Deduplicate the email list once for the whole fan-out.
        deduped_emails: list[str] = []
        seen_lower: set[str] = set()
        for raw_email in emails:
            email = (raw_email or "").strip().lower()
            if email and email not in seen_lower:
                seen_lower.add(email)
                deduped_emails.append(email)

        # Resolve the target-domain set: the primary domain plus any
        # additional ones the caller asked to fan-out to. Each
        # additional id is screened against the same owner-or-manager
        # gate the primary domain already passed (via the view's
        # get_object permission stack).
        targets: list[tuple[Domain | None, int]] = [(domain, domain.id)]
        forbidden_ids: set[int] = set()
        if additional_ids:
            seen_ids: set[int] = {domain.id}
            owner_or_manager = IsDomainOwnerOrManager()
            for dom_id in additional_ids:
                if dom_id in seen_ids:
                    continue
                seen_ids.add(dom_id)
                extra = (
                    Domain.objects.filter(pk=dom_id, active=True)
                    .first()
                )
                if extra is None or not owner_or_manager.has_object_permission(
                    request, self, extra,
                ):
                    targets.append((None, dom_id))
                    forbidden_ids.add(dom_id)
                else:
                    targets.append((extra, dom_id))

        User = get_user_model()
        # Resolve every email → User once instead of once per
        # (email × domain) pair. Case-insensitive match mirrors the
        # original ``filter(email__iexact=...)`` lookup; ``deduped_emails``
        # is already lowercased above.
        users_by_email: dict[str, "User"] = {}
        if deduped_emails:
            for u in (
                User.objects
                .annotate(_email_lower=Lower("email"))
                .filter(_email_lower__in=deduped_emails)
            ):
                users_by_email.setdefault((u.email or "").lower(), u)
        all_results: list[dict] = []
        for target_domain, target_id in targets:
            if target_domain is None:
                # User cannot invite to this domain — surface one row
                # per email so the caller can render the outcome.
                # Three distinct underlying conditions get collapsed
                # into the same ``forbidden_domain`` status:
                #   1. unknown / soft-deleted domain id;
                #   2. domain exists but ``active=False``;
                #   3. domain exists but the caller lacks owner /
                #      manager rights on it.
                # The collapse is intentional (anti-enumeration: a
                # caller cannot tell whether a domain id is unused or
                # simply out of reach for them) — do not split without
                # discussing the security trade-off first.
                for email in deduped_emails:
                    all_results.append({
                        "email": email,
                        "status": "forbidden_domain",
                        "domain_id": target_id,
                    })
                continue

            member_ids = set(target_domain.members.values_list("id", flat=True))
            per_domain_results: list[dict] = []
            for email in deduped_emails:
                existing = users_by_email.get(email)
                if existing and existing.id in member_ids:
                    per_domain_results.append({
                        "email": email,
                        "status": "already_member",
                        "domain_id": target_id,
                    })
                    continue

                try:
                    upsert_invite(
                        domain=target_domain, email=email, inviter=request.user,
                    )
                    send_domain_invite_email(
                        email=email, domain=target_domain,
                        inviter=request.user, language=language,
                    )
                    per_domain_results.append({
                        "email": email,
                        "status": "sent",
                        "domain_id": target_id,
                    })
                except Exception:  # pragma: no cover — defensive
                    per_domain_results.append({
                        "email": email,
                        "status": "invalid",
                        "domain_id": target_id,
                    })

            # One audit row per target domain (not per fan-out) so each
            # domain's history records its own batch outcome.
            record_audit(
                domain=target_domain,
                action="invite.bulk_send",
                actor=request.user,
                metadata={
                    "results": per_domain_results,
                    "language": language,
                    "remote_addr": client_ip(request),
                    "fan_out_size": len(targets),
                },
            )
            all_results.extend(per_domain_results)

        return Response(all_results, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Domain"],
        summary="Lister les invitations en attente sur un domaine",
        responses={status.HTTP_200_OK: DomainInviteReadSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="invitations", pagination_class=None)
    def invitations(self, request, *args, **kwargs):
        domain = self.get_object()
        qs = DomainInvite.objects.filter(
            domain=domain,
            status=DomainInvite.STATUS_PENDING,
        ).order_by("-created_at").select_related("inviter")
        return Response(DomainInviteReadSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Domain"],
        summary="Renvoyer une invitation existante",
        description=(
            "Refresh ``last_sent_at`` + ``expires_at`` du row pending et "
            "réémet l'e-mail avec un nouveau token signé. Idempotent : la "
            "ligne reste la même, seule la date d'envoi change."
        ),
        request=None,
        responses={
            status.HTTP_200_OK: DomainInviteReadSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
        },
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"invitations/(?P<invite_id>[0-9]+)/resend",
        pagination_class=None,
    )
    def invitation_resend(self, request, invite_id=None, *args, **kwargs):
        domain = self.get_object()
        invite = drf_get_object_or_404(
            DomainInvite.objects.filter(
                domain=domain, status=DomainInvite.STATUS_PENDING,
            ),
            pk=invite_id,
        )
        # Reuse the upsert helper to refresh timestamps consistently with
        # the bulk invite path.
        upsert_invite(domain=domain, email=invite.email, inviter=request.user)
        send_domain_invite_email(
            email=invite.email, domain=domain, inviter=request.user,
            language=getattr(request.user, "language", "en") or "en",
        )
        record_audit(
            domain=domain,
            action="invite.resend",
            actor=request.user,
            metadata={"invite_id": invite.id, "email": invite.email, "remote_addr": client_ip(request)},
        )
        invite.refresh_from_db()
        return Response(DomainInviteReadSerializer(invite).data)

    @extend_schema(
        tags=["Domain"],
        summary="Révoquer une invitation en attente",
        description=(
            "Marque l'invitation ``revoked`` : le token déjà émis ne "
            "matche plus la table, le destinataire ne peut plus l'utiliser."
        ),
        request=None,
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Revoked."),
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
        },
    )
    @action(
        detail=True,
        methods=["post"],
        url_path=r"invitations/(?P<invite_id>[0-9]+)/revoke",
        pagination_class=None,
    )
    def invitation_revoke(self, request, invite_id=None, *args, **kwargs):
        domain = self.get_object()
        invite = drf_get_object_or_404(
            DomainInvite.objects.filter(
                domain=domain, status=DomainInvite.STATUS_PENDING,
            ),
            pk=invite_id,
        )
        invite.status = DomainInvite.STATUS_REVOKED
        invite.save(update_fields=["status", "updated_at"])
        record_audit(
            domain=domain,
            action="invite.revoke",
            actor=request.user,
            metadata={"invite_id": invite.id, "email": invite.email, "remote_addr": client_ip(request)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
