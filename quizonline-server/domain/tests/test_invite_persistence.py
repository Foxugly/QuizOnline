"""
Tests for the persisted-invite half of the invite-by-email flow:

- ``upsert_invite`` is idempotent on (domain, email): a second invite
  refreshes the same row instead of inserting a duplicate.
- ``auto_accept_pending_invites_for_email`` sweeps every pending
  invite addressed to the just-confirmed mailbox and adds the user to
  the corresponding domains.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from domain.models import Domain, DomainAuditLog, DomainInvite
from domain.services import auto_accept_pending_invites_for_email, upsert_invite

User = get_user_model()


class UpsertInviteTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)

    def test_creates_pending_row(self):
        inv = upsert_invite(domain=self.domain, email="a@x.test", inviter=self.owner)
        self.assertEqual(inv.email, "a@x.test")
        self.assertEqual(inv.status, DomainInvite.STATUS_PENDING)
        self.assertEqual(inv.domain_id, self.domain.id)

    def test_lowercases_email(self):
        inv = upsert_invite(domain=self.domain, email="MiXeD@X.Test", inviter=self.owner)
        self.assertEqual(inv.email, "mixed@x.test")

    def test_second_invite_refreshes_existing_row(self):
        first = upsert_invite(domain=self.domain, email="a@x.test", inviter=self.owner)
        # Manually backdate so we can detect the refresh.
        DomainInvite.objects.filter(pk=first.pk).update(
            last_sent_at=timezone.now() - timedelta(days=2),
        )
        second = upsert_invite(domain=self.domain, email="a@x.test", inviter=self.owner)
        self.assertEqual(first.id, second.id)
        first.refresh_from_db()
        self.assertGreater(first.last_sent_at, timezone.now() - timedelta(minutes=1))
        # Still exactly one row.
        self.assertEqual(DomainInvite.objects.filter(domain=self.domain).count(), 1)

    def test_accepted_row_does_not_block_new_invite(self):
        # An invite previously accepted should not stop us from minting a
        # fresh pending one (the user may have left and we want them back).
        old = DomainInvite.objects.create(
            domain=self.domain,
            email="a@x.test",
            inviter=self.owner,
            status=DomainInvite.STATUS_ACCEPTED,
            expires_at=timezone.now(),
        )
        new = upsert_invite(domain=self.domain, email="a@x.test", inviter=self.owner)
        self.assertNotEqual(old.id, new.id)


class AutoAcceptOnSignupTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.user = User.objects.create_user(
            password="p", email="newbie@x.test",
        )
        self.d1 = Domain.objects.create(owner=self.owner, name="D1", active=True)
        self.d2 = Domain.objects.create(owner=self.owner, name="D2", active=True)
        # Two pending invitations for this mailbox.
        self.inv1 = DomainInvite.objects.create(
            domain=self.d1, email="newbie@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.inv2 = DomainInvite.objects.create(
            domain=self.d2, email="newbie@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )

    def test_sweeps_all_pending_invites_for_email(self):
        consumed = auto_accept_pending_invites_for_email(user=self.user, email="newbie@x.test")
        self.assertEqual(len(consumed), 2)
        self.assertTrue(self.d1.members.filter(pk=self.user.pk).exists())
        self.assertTrue(self.d2.members.filter(pk=self.user.pk).exists())
        for inv in (self.inv1, self.inv2):
            inv.refresh_from_db()
            self.assertEqual(inv.status, DomainInvite.STATUS_ACCEPTED)
            self.assertEqual(inv.accepted_by_id, self.user.id)

    def test_writes_audit_row_per_consumed_invite(self):
        auto_accept_pending_invites_for_email(user=self.user, email="newbie@x.test")
        rows = DomainAuditLog.objects.filter(action="invite.auto_accept_on_signup")
        self.assertEqual(rows.count(), 2)

    def test_ignores_invites_for_other_mailboxes(self):
        DomainInvite.objects.create(
            domain=self.d1, email="other@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        consumed = auto_accept_pending_invites_for_email(user=self.user, email="newbie@x.test")
        self.assertEqual(len(consumed), 2)

    def test_ignores_expired_invites(self):
        self.inv1.expires_at = timezone.now() - timedelta(days=1)
        self.inv1.save(update_fields=["expires_at"])
        consumed = auto_accept_pending_invites_for_email(user=self.user, email="newbie@x.test")
        self.assertEqual([c.id for c in consumed], [self.inv2.id])
        # Expired one stays pending — the row remains for audit / debug
        # but did not surface in the sweep.
        self.inv1.refresh_from_db()
        self.assertEqual(self.inv1.status, DomainInvite.STATUS_PENDING)

    def test_empty_email_is_a_noop(self):
        self.assertEqual(
            auto_accept_pending_invites_for_email(user=self.user, email=""),
            [],
        )

    def test_is_case_insensitive(self):
        consumed = auto_accept_pending_invites_for_email(
            user=self.user, email="NEWBIE@X.TEST",
        )
        self.assertEqual(len(consumed), 2)
