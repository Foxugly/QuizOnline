from __future__ import annotations

from django.contrib.auth import get_user_model

from domain.models import Domain, JoinPolicy

User = get_user_model()


def users_who_can_approve(domain: Domain) -> list:
    """Owner + managers (if policy is owner_managers). De-duplicated."""
    approvers = {domain.owner}
    if domain.join_policy == JoinPolicy.OWNER_MANAGERS:
        approvers.update(domain.managers.all())
    return [u for u in approvers if u is not None]
