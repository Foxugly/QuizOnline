"""
Tests for the bulk approve / reject endpoints introduced in Phase D.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from domain.models import Domain, DomainAuditLog, DomainJoinRequest, JoinPolicy

User = get_user_model()


class BulkApproveTests(TestCase):
    URL = "/api/domain/{}/join-request/bulk-approve/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.users = [
            User.objects.create_user(password="p", email=f"u{i}@x.test")
            for i in range(3)
        ]
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.reqs = [
            DomainJoinRequest.objects.create(domain=self.domain, user=u)
            for u in self.users
        ]
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_approves_all_pending_in_one_call(self):
        OutboundEmail.objects.all().delete()
        # Capture on_commit callbacks: TestCase wraps each test in a
        # transaction that never commits, so transaction.on_commit
        # callbacks (used to fire approval mails) would otherwise
        # silently skip. ``captureOnCommitCallbacks(execute=True)``
        # runs them inline at the end of the block.
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post(
                self.URL.format(self.domain.id),
                {"request_ids": [r.id for r in self.reqs]},
                format="json",
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"processed": 3, "skipped": 0})
        for r in self.reqs:
            r.refresh_from_db()
            self.assertEqual(r.status, DomainJoinRequest.STATUS_APPROVED)
            self.assertTrue(self.domain.members.filter(pk=r.user_id).exists())
        # One mail per row.
        self.assertEqual(OutboundEmail.objects.count(), 3)

    def test_skips_already_decided_rows(self):
        # Pre-reject the first row.
        self.reqs[0].status = DomainJoinRequest.STATUS_REJECTED
        self.reqs[0].save(update_fields=["status"])
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"request_ids": [r.id for r in self.reqs]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Already-decided row is skipped, the other two go through.
        self.assertEqual(resp.data, {"processed": 2, "skipped": 1})

    def test_skips_unknown_ids(self):
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"request_ids": [r.id for r in self.reqs] + [999_999]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"processed": 3, "skipped": 1})

    def test_writes_one_audit_row(self):
        self.client.post(
            self.URL.format(self.domain.id),
            {"request_ids": [r.id for r in self.reqs]},
            format="json",
        )
        rows = DomainAuditLog.objects.filter(action="join_request.bulk_approve")
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().metadata["processed"], 3)


class BulkRejectTests(TestCase):
    URL = "/api/domain/{}/join-request/bulk-reject/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.users = [
            User.objects.create_user(password="p", email=f"u{i}@x.test")
            for i in range(3)
        ]
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.reqs = [
            DomainJoinRequest.objects.create(domain=self.domain, user=u)
            for u in self.users
        ]
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_rejects_all_pending_with_shared_reason(self):
        OutboundEmail.objects.all().delete()
        # Capture on_commit callbacks so the rejection-mail batch
        # actually fires inside the test transaction; without this
        # wrapper the ``transaction.on_commit`` in the view would
        # silently skip and we would never assert the mail count.
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post(
                self.URL.format(self.domain.id),
                {"request_ids": [r.id for r in self.reqs], "reason": "off-topic"},
                format="json",
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"processed": 3, "skipped": 0})
        for r in self.reqs:
            r.refresh_from_db()
            self.assertEqual(r.status, DomainJoinRequest.STATUS_REJECTED)
            self.assertEqual(r.reject_reason, "off-topic")
        # One mail per rejected row.
        self.assertEqual(OutboundEmail.objects.count(), 3)

    def test_stranger_cannot_bulk_reject(self):
        stranger = User.objects.create_user(email="x@example.test", password="p")
        self.client.force_authenticate(stranger)
        resp = self.client.post(
            self.URL.format(self.domain.id),
            {"request_ids": [r.id for r in self.reqs]},
            format="json",
        )
        # The viewset is scoped to active domains, so the domain
        # itself is found; the permission gate then refuses the
        # stranger and the viewset must return 403 (a 404 would be a
        # contract regression that breaks the dialog UI).
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
