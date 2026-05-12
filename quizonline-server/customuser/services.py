from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction

from core.mailers import send_password_reset_email, send_registration_confirmation_email
from core.mailers.magic_link import send_magic_link_email
from domain.models import Domain, DomainJoinRequest, JoinPolicy
from domain.services import users_who_can_approve
from core.mailers.domain_join import send_join_request_created_email
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .tokens import resolve_user_from_uid, token_is_valid

User = get_user_model()


def register_user(serializer):
    user = serializer.save()
    send_registration_confirmation_email(user)
    return user


def request_password_reset(email: str, request) -> None:
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return

    user.must_change_password = True
    user.save(update_fields=["must_change_password"])
    send_password_reset_email(user)


def request_magic_link(email: str) -> None:
    """
    If a user with ``email`` exists, queue a magic-link mail. Otherwise
    silently return — we do NOT reveal account existence through this
    endpoint (constant-time behaviour from the caller's perspective).
    The endpoint is rate-limited at the view layer; here we only do the
    happy-path mail-send.

    Requires the user to be active and email-confirmed; otherwise the
    magic link would bypass our usual sign-in guards.
    """
    user = User.objects.filter(email__iexact=(email or "").strip()).first()
    if user is None:
        return
    if not user.is_active or not getattr(user, "email_confirmed", False):
        return
    send_magic_link_email(user=user)


def exchange_magic_link(*, user_id: int):
    """
    Resolve the user id baked in a magic-link token and return the user
    iff it would normally be allowed to log in. Returns ``None`` for any
    refusal so the view layer can map a single "invalid or expired"
    response shape and never leak the cause.
    """
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return None
    if not user.is_active or not getattr(user, "email_confirmed", False):
        return None
    return user


def revoke_user_refresh_tokens(user) -> None:
    outstanding_tokens = OutstandingToken.objects.filter(user=user)
    for token in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(token=token)


def confirm_password_reset(uid: str, token: str, new_password: str):
    user = resolve_user_from_uid(uid)
    if not token_is_valid(user, token):
        return None

    with transaction.atomic():
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        revoke_user_refresh_tokens(user)
    return user


def confirm_email(uid: str, token: str):
    user = resolve_user_from_uid(uid)
    if not token_is_valid(user, token):
        return None

    if not user.email_confirmed:
        user.email_confirmed = True
        user.save(update_fields=["email_confirmed"])
        # Just-confirmed accounts may be carrying pending domain
        # invitations addressed to this mail. Now that we know the
        # mailbox belongs to the user, sweep & accept them so the
        # invitee lands inside every domain they were invited to.
        # Import lazily to avoid a customuser → domain → customuser
        # cycle at module load.
        try:
            from domain.services import auto_accept_pending_invites_for_email
            auto_accept_pending_invites_for_email(user=user, email=user.email or "")
        except Exception:  # pragma: no cover — defensive
            # An invite-side failure must not block the activation
            # itself: the user is still email-confirmed, they can
            # accept manually by re-clicking the invitation mail.
            pass
    return user


def change_password(user, old_password: str, new_password: str) -> bool:
    if not user.check_password(old_password):
        return False

    with transaction.atomic():
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        revoke_user_refresh_tokens(user)
    return True


def reconcile_user_domain_membership(user, target_domain_ids):
    """
    Apply a target list of domain IDs to a user's `linked_domains`.

    - Domains that disappear from the list are removed unconditionally
      (self-leave is always allowed).
    - Domains that appear in the list and have `join_policy == auto` are
      added directly.
    - Domains that appear in the list and have a validation policy create
      a `pending` `DomainJoinRequest` (idempotent -- `get_or_create`).

    Notification emails for newly created pending requests are scheduled
    via `transaction.on_commit` so callers can run inside their own
    transaction safely. The helper wraps its own work in
    `transaction.atomic()` defensively because the project does not enable
    `ATOMIC_REQUESTS`, and `on_commit` outside a transaction fires
    synchronously, which defeats the scheduling intent.
    """
    with transaction.atomic():
        existing_ids = set(user.linked_domains.values_list("id", flat=True))
        target_ids = set(target_domain_ids or [])

        to_remove = existing_ids - target_ids
        to_add_ids = target_ids - existing_ids

        if to_remove:
            user.linked_domains.remove(*to_remove)

        if not to_add_ids:
            return

        domains_to_add = list(
            Domain.objects.filter(id__in=to_add_ids, active=True)
        )

        auto_domains = [d for d in domains_to_add if d.join_policy == JoinPolicy.AUTO]
        if auto_domains:
            user.linked_domains.add(*auto_domains)

        validation_domains = [d for d in domains_to_add if d.join_policy != JoinPolicy.AUTO]
        for domain in validation_domains:
            join_request, created = DomainJoinRequest.objects.get_or_create(
                domain=domain,
                user=user,
                status=DomainJoinRequest.STATUS_PENDING,
            )
            if created:
                approvers = users_who_can_approve(domain)
                transaction.on_commit(
                    lambda jr=join_request, ap=approvers: send_join_request_created_email(
                        join_request=jr, recipients=ap
                    )
                )
