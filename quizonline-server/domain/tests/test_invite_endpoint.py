"""
Tests for the email-invitation flow:

- ``POST /api/domain/{id}/invite/`` (owner/manager only, sends mails)
- ``GET/POST /api/domain/invite/accept/<token>/`` (public landing,
  authenticated accept)
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from domain.invite_token import make_invite_token
from domain.models import Domain, JoinPolicy

User = get_user_model()


class DomainInviteEndpointTests(TestCase):
    URL = "/api/domain/{}/invite/"

    def setUp(self):
        self.owner = User.objects.create_user(username="ow", password="p", email="o@x.test")
        self.manager = User.objects.create_user(username="mg", password="p", email="m@x.test")
        self.stranger = User.objects.create_user(username="sg", password="p", email="s@x.test")
        self.existing_member = User.objects.create_user(
            username="memb", password="p", email="memb@x.test",
        )
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER_MANAGERS,
        )
        self.domain.managers.add(self.manager)
        self.domain.members.add(self.existing_member)
        self.client = APIClient()

    def test_requires_authentication(self):
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["x@y.test"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stranger_cannot_invite(self):
        self.client.force_authenticate(self.stranger)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["x@y.test"]},
            format="json",
        )
        # Domain is hidden from the queryset for a non-owner / non-manager
        # → 404 by design (does not disclose existence).
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_invites_new_address_queues_email(self):
        OutboundEmail.objects.all().delete()
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["fresh@x.test"], "language": "fr"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resp.data,
            [{"email": "fresh@x.test", "status": "sent", "domain_id": self.domain.id}],
        )
        self.assertEqual(OutboundEmail.objects.count(), 1)
        outbound = OutboundEmail.objects.first()
        self.assertIn("fresh@x.test", outbound.recipients)
        self.assertIn("/invite/accept/", outbound.body)

    def test_manager_can_invite(self):
        OutboundEmail.objects.all().delete()
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["fresh@x.test"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]["status"], "sent")

    def test_invite_skips_already_members(self):
        OutboundEmail.objects.all().delete()
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": [self.existing_member.email]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]["status"], "already_member")
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_invite_deduplicates_within_one_request(self):
        OutboundEmail.objects.all().delete()
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["a@x.test", "A@x.test", "a@x.test"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # All three normalize to "a@x.test" → one outcome, one mail.
        self.assertEqual(
            resp.data,
            [{"email": "a@x.test", "status": "sent", "domain_id": self.domain.id}],
        )
        self.assertEqual(OutboundEmail.objects.count(), 1)

    def test_invite_rejects_invalid_email_at_validation(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"emails": ["not-an-email"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class DomainMultiDomainInviteTests(TestCase):
    """Phase C #18: fan an invite out to additional domains in one call."""

    URL = "/api/domain/{}/invite/"

    def setUp(self):
        self.owner = User.objects.create_user(username="ow", password="p", email="o@x.test")
        self.stranger = User.objects.create_user(username="sg", password="p")
        # Three domains: the primary, a second one the owner also owns,
        # and a third domain owned by someone else (forbidden).
        self.primary = Domain.objects.create(
            owner=self.owner, name="P", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.also_mine = Domain.objects.create(
            owner=self.owner, name="A", active=True, join_policy=JoinPolicy.OWNER,
        )
        other_owner = User.objects.create_user(username="oth", password="p")
        self.foreign = Domain.objects.create(
            owner=other_owner, name="F", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_fan_out_to_owned_domain_sends_two_mails(self):
        OutboundEmail.objects.all().delete()
        resp = self.client.post(
            self.URL.format(self.primary.id),
            {
                "emails": ["fresh@x.test"],
                "additional_domain_ids": [self.also_mine.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        statuses = sorted(
            (row["domain_id"], row["status"]) for row in resp.data
        )
        self.assertEqual(
            statuses,
            sorted([
                (self.primary.id, "sent"),
                (self.also_mine.id, "sent"),
            ]),
        )
        # One mail per (email × domain) pair.
        self.assertEqual(OutboundEmail.objects.count(), 2)

    def test_forbidden_domain_surfaces_forbidden_row(self):
        OutboundEmail.objects.all().delete()
        resp = self.client.post(
            self.URL.format(self.primary.id),
            {
                "emails": ["fresh@x.test"],
                "additional_domain_ids": [self.foreign.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        by_domain = {row["domain_id"]: row for row in resp.data}
        self.assertEqual(by_domain[self.primary.id]["status"], "sent")
        self.assertEqual(by_domain[self.foreign.id]["status"], "forbidden_domain")
        # Only the primary domain sends mail.
        self.assertEqual(OutboundEmail.objects.count(), 1)

    def test_dedup_when_primary_id_repeats_in_additional(self):
        # Putting the primary id in ``additional_domain_ids`` should
        # not cause the email to go out twice.
        OutboundEmail.objects.all().delete()
        resp = self.client.post(
            self.URL.format(self.primary.id),
            {
                "emails": ["fresh@x.test"],
                "additional_domain_ids": [self.primary.id, self.also_mine.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        domain_ids = sorted(row["domain_id"] for row in resp.data)
        self.assertEqual(domain_ids, sorted([self.primary.id, self.also_mine.id]))


class DomainInviteAcceptEndpointTests(TestCase):
    URL = "/api/domain/invite/accept/{}/"

    def setUp(self):
        self.owner = User.objects.create_user(username="ow", password="p", email="o@x.test")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.client = APIClient()

    def _token(self, *, email: str, domain=None, inviter=None) -> str:
        return make_invite_token(
            domain_id=(domain or self.domain).id,
            email=email,
            inviter_id=(inviter or self.owner).id,
        )

    def test_get_anonymous_signup_required_when_no_account(self):
        token = self._token(email="newbie@x.test")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "signup_required")
        self.assertEqual(resp.data["invited_email"], "newbie@x.test")
        self.assertEqual(resp.data["domain_id"], self.domain.id)
        self.assertEqual(resp.data["inviter_username"], self.owner.username)

    def test_get_anonymous_login_required_when_account_exists(self):
        User.objects.create_user(username="seen", password="p", email="seen@x.test")
        token = self._token(email="seen@x.test")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "login_required")

    def test_get_authenticated_ready_to_accept(self):
        user = User.objects.create_user(username="match", password="p", email="match@x.test")
        self.client.force_authenticate(user)
        token = self._token(email="match@x.test")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "ready_to_accept")

    def test_get_authenticated_wrong_account(self):
        user = User.objects.create_user(username="other", password="p", email="other@x.test")
        self.client.force_authenticate(user)
        token = self._token(email="target@x.test")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "wrong_account")

    def test_get_already_member(self):
        user = User.objects.create_user(username="already", password="p", email="already@x.test")
        self.domain.members.add(user)
        self.client.force_authenticate(user)
        token = self._token(email="already@x.test")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "already_member")

    def test_get_expired_token(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = self._token(email="any@x.test")
            mock_time.time.return_value = 1_000_000 + 10 * 24 * 3600
            resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)

    def test_get_invalid_token(self):
        resp = self.client.get(self.URL.format("garbage"))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_accepts_and_adds_member(self):
        user = User.objects.create_user(username="match", password="p", email="match@x.test")
        self.client.force_authenticate(user)
        token = self._token(email="match@x.test")
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "accepted")
        self.assertTrue(self.domain.members.filter(pk=user.pk).exists())

    def test_post_wrong_account_refused(self):
        user = User.objects.create_user(username="other", password="p", email="other@x.test")
        self.client.force_authenticate(user)
        token = self._token(email="target@x.test")
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data["state"], "wrong_account")
        self.assertFalse(self.domain.members.filter(pk=user.pk).exists())

    def test_post_anonymous_returns_signup_required(self):
        """Anonymous POST is not a 401 — it's the signup-required signal."""
        token = self._token(email="newbie@x.test")
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "signup_required")

    def test_post_idempotent_when_already_member(self):
        user = User.objects.create_user(username="already", password="p", email="already@x.test")
        self.domain.members.add(user)
        self.client.force_authenticate(user)
        token = self._token(email="already@x.test")
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "already_member")
