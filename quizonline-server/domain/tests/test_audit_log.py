"""
Tests for ``DomainAuditLog`` and the ``record_audit`` helper.

The model itself is mostly a thin wrapper, so we focus the tests on
the per-action wiring: each meaningful endpoint that mutates a domain
should produce a row with the expected action name and target user.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from domain.invite_token import make_invite_token
from domain.models import Domain, DomainAuditLog, DomainJoinRequest, JoinPolicy
from domain.services import record_audit

User = get_user_model()


class RecordAuditHelperTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.target = User.objects.create_user(username="t", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)

    def test_creates_row_with_actor_target_and_metadata(self):
        row = record_audit(
            domain=self.domain,
            action="member.promote",
            actor=self.owner,
            target_user=self.target,
            metadata={"remote_addr": "1.2.3.4"},
        )
        self.assertEqual(row.domain_id, self.domain.id)
        self.assertEqual(row.actor_id, self.owner.id)
        self.assertEqual(row.target_user_id, self.target.id)
        self.assertEqual(row.action, "member.promote")
        self.assertEqual(row.metadata["remote_addr"], "1.2.3.4")

    def test_actor_can_be_none_for_system_actions(self):
        row = record_audit(domain=self.domain, action="cron.auto_decline")
        self.assertIsNone(row.actor_id)
        self.assertIsNone(row.target_user_id)
        self.assertEqual(row.metadata, {})

    def test_accepts_domain_id_int(self):
        row = record_audit(domain=self.domain.id, action="x")
        self.assertEqual(row.domain_id, self.domain.id)

    def test_action_is_truncated(self):
        row = record_audit(domain=self.domain, action="a" * 200)
        self.assertEqual(len(row.action), DomainAuditLog.ACTION_MAX_LENGTH)


class MemberRoleActionsRecordAuditTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.target = User.objects.create_user(username="t", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.domain.members.add(self.target)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_promote_writes_audit_row(self):
        resp = self.client.post(
            f"/api/domain/{self.domain.id}/member-role/",
            {"user_id": self.target.id, "is_domain_manager": True},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        row = DomainAuditLog.objects.filter(action="member.promote").first()
        self.assertIsNotNone(row)
        self.assertEqual(row.actor_id, self.owner.id)
        self.assertEqual(row.target_user_id, self.target.id)

    def test_remove_writes_audit_row(self):
        resp = self.client.post(
            f"/api/domain/{self.domain.id}/member-role/",
            {"user_id": self.target.id, "remove_member": True},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            DomainAuditLog.objects.filter(action="member.remove", target_user=self.target).exists()
        )


class JoinRequestActionsRecordAuditTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.joiner = User.objects.create_user(username="j", password="p", email="j@x.test")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.req = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_approve_writes_audit_row(self):
        resp = self.client.post(
            f"/api/domain/{self.domain.id}/join-request/{self.req.id}/approve/",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            DomainAuditLog.objects.filter(
                action="join_request.approve", target_user=self.joiner
            ).exists()
        )

    def test_reject_writes_audit_row_with_reason(self):
        resp = self.client.post(
            f"/api/domain/{self.domain.id}/join-request/{self.req.id}/reject/",
            {"reason": "spam"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        row = DomainAuditLog.objects.filter(action="join_request.reject").first()
        self.assertIsNotNone(row)
        self.assertEqual(row.metadata["reason"], "spam")

    def test_email_decide_writes_audit_row(self):
        token = make_invite_token  # silence linter
        from domain.decision_token import make_decision_token
        token = make_decision_token(
            request_id=self.req.id, recipient_user_id=self.owner.id, action="approve",
        )
        resp = self.client.post(f"/api/domain/join-request/decide/{token}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            DomainAuditLog.objects.filter(
                action="join_request.approve_via_email", target_user=self.joiner
            ).exists()
        )


class InviteActionRecordAuditTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_invite_writes_single_bulk_audit_row(self):
        resp = self.client.post(
            f"/api/domain/{self.domain.id}/invite/",
            {"emails": ["a@x.test", "b@x.test"], "language": "fr"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = DomainAuditLog.objects.filter(action="invite.bulk_send")
        # One row per HTTP call, not per address (intentional — see the
        # comment in the view).
        self.assertEqual(rows.count(), 1)
        self.assertEqual(len(rows.first().metadata["results"]), 2)


class AuditLogEndpointTests(TestCase):
    URL = "/api/domain/{}/audit/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.outsider = User.objects.create_user(username="x", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        # Two audit rows on this domain, one on another (must not leak).
        DomainAuditLog.objects.create(
            domain=self.domain, actor=self.owner, action="member.promote", metadata={},
        )
        DomainAuditLog.objects.create(
            domain=self.domain, actor=self.owner, action="invite.bulk_send", metadata={},
        )
        other = Domain.objects.create(owner=self.owner, name="Other", active=True)
        DomainAuditLog.objects.create(
            domain=other, actor=self.owner, action="member.demote", metadata={},
        )
        self.client = APIClient()

    def test_owner_sees_own_domain_audit(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data.get("results", resp.data)
        actions = sorted(r["action"] for r in rows)
        self.assertEqual(actions, ["invite.bulk_send", "member.promote"])

    def test_outsider_is_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class LeaveActionRecordAuditTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.member = User.objects.create_user(username="m", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.domain.members.add(self.member)
        self.client = APIClient()
        self.client.force_authenticate(self.member)

    def test_leave_writes_audit_row(self):
        resp = self.client.post(f"/api/domain/{self.domain.id}/leave/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        row = DomainAuditLog.objects.filter(action="member.self_leave").first()
        self.assertIsNotNone(row)
        self.assertEqual(row.actor_id, self.member.id)
        self.assertEqual(row.target_user_id, self.member.id)
