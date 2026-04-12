from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction

from core.mailers import send_password_reset_email, send_registration_confirmation_email
from domain.models import Domain, DomainJoinRequest, JoinPolicy
from domain.services import users_who_can_approve
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
    transaction safely.
    """
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
        user.linked_domains.add(*[d.id for d in auto_domains])

    validation_domains = [d for d in domains_to_add if d.join_policy != JoinPolicy.AUTO]
    for domain in validation_domains:
        join_request, created = DomainJoinRequest.objects.get_or_create(
            domain=domain,
            user=user,
            status=DomainJoinRequest.STATUS_PENDING,
        )
        if created:
            from core.mailers.domain_join import send_join_request_created_email
            approvers = users_who_can_approve(domain)
            transaction.on_commit(
                lambda jr=join_request, ap=approvers: send_join_request_created_email(
                    join_request=jr, recipients=ap
                )
            )
