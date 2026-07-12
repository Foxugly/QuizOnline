"""
Tests for the in-app notifications feature: emit helper, list/filter,
unread-count, mark-read flows, soft-delete and the auto-emission from
the existing mailers (so we never silently drop a web notification
when an email is also queued).
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from customuser.models import Notification
from customuser.notifications import (
    KIND_INVITE_RECEIVED,
    KIND_JOIN_REQUEST_CREATED,
    KIND_JOIN_REQUEST_DECIDED,
    KIND_JOIN_REQUEST_EXPIRY,
    KIND_TRANSFER_RECEIVED,
    emit_notification,
)
from domain.models import Domain, DomainJoinRequest, JoinPolicy

User = get_user_model()


class EmitNotificationHelperTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@example.test", password="p")

    def test_emit_creates_row_with_payload(self):
        notif = emit_notification(
            user=self.user,
            kind=KIND_INVITE_RECEIVED,
            payload={"domain_id": 1, "x": "y"},
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.user_id, self.user.id)
        self.assertEqual(notif.kind, KIND_INVITE_RECEIVED)
        self.assertEqual(notif.payload, {"domain_id": 1, "x": "y"})
        self.assertIsNone(notif.read_at)
        self.assertIsNone(notif.deleted_at)

    def test_emit_returns_none_for_anonymous(self):
        self.assertIsNone(emit_notification(user=None, kind="x"))

    def test_emit_truncates_overlong_kind(self):
        notif = emit_notification(user=self.user, kind="a" * 200)
        self.assertEqual(len(notif.kind), Notification.KIND_MAX_LENGTH)

    def test_emit_does_not_check_prefs(self):
        # Even if the user opted out, the in-app trace must persist
        # — the user can later mute future mails without losing
        # visibility on what happened.
        self.user.notification_prefs = {KIND_INVITE_RECEIVED: False}
        self.user.save(update_fields=["notification_prefs"])
        emit_notification(user=self.user, kind=KIND_INVITE_RECEIVED)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)


class NotificationApiListTests(TestCase):
    URL = "/api/notification/"

    def setUp(self):
        self.user = User.objects.create_user(email="u@example.test", password="p")
        self.other = User.objects.create_user(email="o@example.test", password="p")
        self.unread = Notification.objects.create(user=self.user, kind="domain.invite.received")
        self.read = Notification.objects.create(user=self.user, kind="x")
        self.read.read_at = self.read.created_at
        self.read.save(update_fields=["read_at"])
        self.deleted = Notification.objects.create(user=self.user, kind="y")
        self.deleted.deleted_at = self.deleted.created_at
        self.deleted.save(update_fields=["deleted_at"])
        # Another user's notification — must not leak.
        Notification.objects.create(user=self.other, kind="z")

        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_anonymous_is_401(self):
        anon = APIClient()
        resp = anon.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_default_filter_is_unread(self):
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data.get("results", resp.data)
        ids = [r["id"] for r in rows]
        self.assertEqual(ids, [self.unread.id])

    def test_status_all_excludes_deleted(self):
        resp = self.client.get(self.URL, {"status": "all"})
        rows = resp.data.get("results", resp.data)
        ids = {r["id"] for r in rows}
        self.assertEqual(ids, {self.unread.id, self.read.id})

    def test_status_deleted_returns_only_deleted(self):
        resp = self.client.get(self.URL, {"status": "deleted"})
        rows = resp.data.get("results", resp.data)
        ids = [r["id"] for r in rows]
        self.assertEqual(ids, [self.deleted.id])

    def test_does_not_leak_other_user_rows(self):
        resp = self.client.get(self.URL, {"status": "all"})
        rows = resp.data.get("results", resp.data)
        for r in rows:
            self.assertNotEqual(r["kind"], "z")


class NotificationApiUnreadCountTests(TestCase):
    URL = "/api/notification/unread-count/"

    def setUp(self):
        self.user = User.objects.create_user(email="u@example.test", password="p")
        Notification.objects.create(user=self.user, kind="a")
        Notification.objects.create(user=self.user, kind="b")
        deleted = Notification.objects.create(user=self.user, kind="c")
        deleted.deleted_at = deleted.created_at
        deleted.save(update_fields=["deleted_at"])
        read = Notification.objects.create(user=self.user, kind="d")
        read.read_at = read.created_at
        read.save(update_fields=["read_at"])
        # Another user's rows must not bleed in.
        other = User.objects.create_user(email="o@example.test", password="p")
        Notification.objects.create(user=other, kind="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_unread_count_excludes_read_and_deleted(self):
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"unread": 2})


class NotificationApiMarkReadTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@example.test", password="p")
        self.other = User.objects.create_user(email="o@example.test", password="p")
        self.notif = Notification.objects.create(user=self.user, kind="a")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_mark_one_sets_read_at(self):
        resp = self.client.post(f"/api/notification/{self.notif.id}/read/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.read_at)

    def test_mark_one_for_other_user_is_404(self):
        other_notif = Notification.objects.create(user=self.other, kind="x")
        resp = self.client.post(f"/api/notification/{other_notif.id}/read/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.user, kind="b")
        Notification.objects.create(user=self.user, kind="c")
        resp = self.client.post("/api/notification/read-all/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"updated": 3})
        remaining = Notification.objects.filter(
            user=self.user, read_at__isnull=True,
        ).count()
        self.assertEqual(remaining, 0)


class NotificationApiSoftDeleteTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@example.test", password="p")
        self.other = User.objects.create_user(email="o@example.test", password="p")
        self.notif = Notification.objects.create(user=self.user, kind="a")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_delete_sets_deleted_at(self):
        resp = self.client.delete(f"/api/notification/{self.notif.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.deleted_at)
        # Row still exists — soft delete.
        self.assertTrue(Notification.objects.filter(pk=self.notif.pk).exists())

    def test_delete_other_user_is_404(self):
        other_notif = Notification.objects.create(user=self.other, kind="x")
        resp = self.client.delete(f"/api/notification/{other_notif.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class TwoChannelResolutionTests(TestCase):
    """Resolve the (domain × user × kind × channel) intersection."""

    def setUp(self):
        from customuser.notifications import channel_enabled, notify
        self.channel_enabled = channel_enabled
        self.notify = notify
        self.user = User.objects.create_user(
            password="p", email="u@x.test",
        )
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )

    def test_default_both_channels_enabled(self):
        self.assertTrue(self.channel_enabled(user=self.user, kind="x", channel="email"))
        self.assertTrue(self.channel_enabled(user=self.user, kind="x", channel="web"))

    def test_user_can_mute_web_independently(self):
        self.user.notification_prefs = {"x": {"web": False}}
        self.user.save(update_fields=["notification_prefs"])
        self.assertTrue(self.channel_enabled(user=self.user, kind="x", channel="email"))
        self.assertFalse(self.channel_enabled(user=self.user, kind="x", channel="web"))

    def test_user_can_mute_email_independently(self):
        self.user.notification_prefs = {"x": {"email": False}}
        self.user.save(update_fields=["notification_prefs"])
        self.assertFalse(self.channel_enabled(user=self.user, kind="x", channel="email"))
        self.assertTrue(self.channel_enabled(user=self.user, kind="x", channel="web"))

    def test_domain_off_mutes_all_channels(self):
        """Domain-level on/off: if the domain says off, both email and
        web are muted regardless of the user's pref."""
        self.domain.notification_settings = {"x": False}
        self.domain.save(update_fields=["notification_settings"])
        self.assertFalse(self.channel_enabled(
            user=self.user, kind="x", channel="email", domain=self.domain,
        ))
        self.assertFalse(self.channel_enabled(
            user=self.user, kind="x", channel="web", domain=self.domain,
        ))

    def test_domain_on_lets_user_pick_channels(self):
        """Conversely, when the domain says on, the user's channel
        choice is honoured even if they only want one of the two."""
        self.user.notification_prefs = {"x": {"email": False}}
        self.user.save(update_fields=["notification_prefs"])
        self.assertFalse(self.channel_enabled(
            user=self.user, kind="x", channel="email", domain=self.domain,
        ))
        self.assertTrue(self.channel_enabled(
            user=self.user, kind="x", channel="web", domain=self.domain,
        ))

    def test_legacy_bool_false_means_email_off(self):
        # ``notification_enabled`` was the legacy gate, still asks "is
        # the email channel on at the user level?".
        from customuser.notifications import notification_enabled
        self.user.notification_prefs = {"x": False}
        self.user.save(update_fields=["notification_prefs"])
        self.assertFalse(notification_enabled(self.user, "x"))

    def test_notify_fires_both_channels_by_default(self):
        called = {"mail": 0}
        result = self.notify(
            user=self.user,
            kind="domain.invite.received",
            payload={"x": 1},
            domain=self.domain,
            email_callable=lambda: called.__setitem__("mail", called["mail"] + 1),
        )
        self.assertEqual(result, {"web": True, "email": True})
        self.assertEqual(called["mail"], 1)
        self.assertTrue(
            Notification.objects.filter(user=self.user, kind="domain.invite.received").exists()
        )

    def test_notify_drops_web_when_user_muted_it(self):
        called = {"mail": 0}
        self.user.notification_prefs = {"domain.invite.received": {"web": False}}
        self.user.save(update_fields=["notification_prefs"])
        result = self.notify(
            user=self.user,
            kind="domain.invite.received",
            email_callable=lambda: called.__setitem__("mail", called["mail"] + 1),
        )
        self.assertEqual(result, {"web": False, "email": True})
        self.assertEqual(called["mail"], 1)
        self.assertFalse(Notification.objects.filter(user=self.user).exists())

    def test_notify_drops_everything_when_domain_off(self):
        """When the domain mutes the kind, both channels are dropped."""
        called = {"mail": 0}
        self.domain.notification_settings = {"domain.invite.received": False}
        self.domain.save(update_fields=["notification_settings"])
        result = self.notify(
            user=self.user,
            kind="domain.invite.received",
            domain=self.domain,
            email_callable=lambda: called.__setitem__("mail", called["mail"] + 1),
        )
        self.assertEqual(result, {"web": False, "email": False})
        self.assertEqual(called["mail"], 0)

    def test_notify_resolves_conflict_in_favour_of_user_choice(self):
        """The classic conflict case: user wants email-only, regardless
        of what the domain prefers — the domain only gates whether the
        event is communicated, not how."""
        called = {"mail": 0}
        # Domain is on (default).
        self.user.notification_prefs = {
            "domain.invite.received": {"web": False},
        }
        self.user.save(update_fields=["notification_prefs"])
        result = self.notify(
            user=self.user,
            kind="domain.invite.received",
            domain=self.domain,
            email_callable=lambda: called.__setitem__("mail", called["mail"] + 1),
        )
        self.assertEqual(result, {"web": False, "email": True})
        self.assertEqual(called["mail"], 1)

    def test_notify_no_email_when_user_has_no_address(self):
        called = {"mail": 0}
        self.user.email = ""
        self.user.save(update_fields=["email"])
        result = self.notify(
            user=self.user,
            kind="x",
            email_callable=lambda: called.__setitem__("mail", called["mail"] + 1),
        )
        self.assertEqual(result, {"web": True, "email": False})
        self.assertEqual(called["mail"], 0)


class NormalizePrefsTwoChannelTests(TestCase):
    def test_accepts_new_shape(self):
        from customuser.notifications import normalize_prefs
        out = normalize_prefs({
            "domain.invite.received": {"email": False, "web": True},
            "domain.transfer.received": {"email": False, "web": False},
        })
        # ``True`` values are stripped (sparse), only False persisted.
        self.assertEqual(out["domain.invite.received"], {"email": False})
        self.assertEqual(out["domain.transfer.received"], {"email": False, "web": False})

    def test_back_compat_with_legacy_bool(self):
        from customuser.notifications import normalize_prefs
        out = normalize_prefs({"domain.invite.received": False})
        self.assertEqual(out["domain.invite.received"], {"email": False})

    def test_unknown_kinds_are_dropped(self):
        from customuser.notifications import normalize_prefs
        out = normalize_prefs({"made.up.kind": {"email": False}})
        self.assertEqual(out, {})

    def test_garbage_inputs(self):
        from customuser.notifications import normalize_prefs
        self.assertEqual(normalize_prefs("nope"), {})
        self.assertEqual(normalize_prefs(None), {})
        self.assertEqual(normalize_prefs({"x": "nonsense"}), {})


class MailerEmitsWebNotificationTests(TestCase):
    """The 5 mailers must always drop a Notification row."""

    def setUp(self):
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.requester = User.objects.create_user(
            password="p", email="r@x.test",
        )
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )

    def test_join_request_created_emits_web_for_recipient(self):
        from core.mailers.domain_join import send_join_request_created_email
        jr = DomainJoinRequest.objects.create(domain=self.domain, user=self.requester)
        send_join_request_created_email(join_request=jr, recipients=[self.owner])
        self.assertTrue(
            Notification.objects.filter(
                user=self.owner, kind=KIND_JOIN_REQUEST_CREATED,
            ).exists()
        )

    def test_join_request_approved_emits_web_even_when_email_muted(self):
        from core.mailers.domain_join import send_join_request_approved_email
        self.requester.notification_prefs = {KIND_JOIN_REQUEST_DECIDED: False}
        self.requester.save(update_fields=["notification_prefs"])
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=self.requester,
            status=DomainJoinRequest.STATUS_APPROVED,
        )
        send_join_request_approved_email(join_request=jr)
        self.assertTrue(
            Notification.objects.filter(
                user=self.requester,
                kind=KIND_JOIN_REQUEST_DECIDED,
                payload__outcome="approved",
            ).exists()
        )

    def test_join_request_rejected_carries_reason_in_payload(self):
        from core.mailers.domain_join import send_join_request_rejected_email
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=self.requester,
            status=DomainJoinRequest.STATUS_REJECTED,
            reject_reason="spam",
        )
        send_join_request_rejected_email(join_request=jr)
        notif = Notification.objects.get(
            user=self.requester, kind=KIND_JOIN_REQUEST_DECIDED,
        )
        self.assertEqual(notif.payload["outcome"], "rejected")
        self.assertEqual(notif.payload["reason"], "spam")

    def test_expiry_warning_emits_web(self):
        from core.mailers.domain_join import send_join_request_expiry_warning_email
        jr = DomainJoinRequest.objects.create(domain=self.domain, user=self.requester)
        send_join_request_expiry_warning_email(join_request=jr, days_left=2)
        notif = Notification.objects.get(
            user=self.requester, kind=KIND_JOIN_REQUEST_EXPIRY,
        )
        self.assertEqual(notif.payload["days_left"], 2)

    def test_domain_invite_emits_web_for_existing_user(self):
        from core.mailers.domain_invite import send_domain_invite_email
        send_domain_invite_email(
            email=self.requester.email, domain=self.domain, inviter=self.owner,
            language="fr",
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.requester, kind=KIND_INVITE_RECEIVED,
            ).exists()
        )

    def test_domain_invite_no_web_row_when_no_existing_user(self):
        from core.mailers.domain_invite import send_domain_invite_email
        send_domain_invite_email(
            email="nobody@x.test", domain=self.domain, inviter=self.owner,
            language="fr",
        )
        self.assertFalse(Notification.objects.filter(kind=KIND_INVITE_RECEIVED).exists())

    def test_domain_transfer_emits_web(self):
        from core.mailers.domain_transfer import send_domain_transfer_email
        future_owner = User.objects.create_user(
            password="p", email="f@x.test",
        )
        send_domain_transfer_email(
            domain=self.domain, initiator=self.owner, future_owner=future_owner,
        )
        self.assertTrue(
            Notification.objects.filter(
                user=future_owner, kind=KIND_TRANSFER_RECEIVED,
            ).exists()
        )

    def test_domain_off_drops_everything_for_invite(self):
        # Owner turns invitations off entirely for this domain.
        self.domain.notification_settings = {KIND_INVITE_RECEIVED: False}
        self.domain.save(update_fields=["notification_settings"])
        from core.mailers.domain_invite import send_domain_invite_email
        from core.models import OutboundEmail
        OutboundEmail.objects.all().delete()
        send_domain_invite_email(
            email=self.requester.email, domain=self.domain, inviter=self.owner,
            language="fr",
        )
        self.assertFalse(
            Notification.objects.filter(
                user=self.requester, kind=KIND_INVITE_RECEIVED,
            ).exists()
        )
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_user_can_mute_web_independently_of_email(self):
        from core.mailers.domain_join import send_join_request_approved_email
        self.requester.notification_prefs = {
            "domain.join_request.decided": {"web": False},
        }
        self.requester.save(update_fields=["notification_prefs"])
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=self.requester,
            status=DomainJoinRequest.STATUS_APPROVED,
        )
        send_join_request_approved_email(join_request=jr)
        self.assertFalse(
            Notification.objects.filter(
                user=self.requester, kind="domain.join_request.decided",
            ).exists()
        )


class QuizMailerEmitsWebNotificationTests(TestCase):
    """The 4 quiz mailers should now also produce in-app rows."""

    def setUp(self):
        from quiz.models import QuizTemplate, Quiz
        self.creator = User.objects.create_user(
            password="p", email="c@x.test",
        )
        self.assignee = User.objects.create_user(
            password="p", email="a@x.test",
        )
        self.domain = Domain.objects.create(
            owner=self.creator, name="D", active=True,
        )
        self.template = QuizTemplate.objects.create(
            title="T", created_by=self.creator, domain=self.domain,
        )
        self.quiz = Quiz.objects.create(
            quiz_template=self.template, user=self.assignee,
        )

    def test_quiz_assignment_emits_web(self):
        from core.mailers.quiz import send_quiz_assignment_email
        send_quiz_assignment_email(self.quiz)
        self.assertTrue(
            Notification.objects.filter(
                user=self.assignee, kind="quiz.assignment",
                payload__template_title="T",
            ).exists()
        )

    def test_quiz_completed_emits_web_to_creator(self):
        from core.mailers.quiz import send_quiz_completed_email
        send_quiz_completed_email(self.quiz)
        self.assertTrue(
            Notification.objects.filter(
                user=self.creator, kind="quiz.completed",
                payload__user_name="a@x.test",
            ).exists()
        )

    def test_result_available_emits_web(self):
        from core.mailers.quiz import send_result_available_email
        send_result_available_email(self.quiz)
        self.assertTrue(
            Notification.objects.filter(
                user=self.assignee, kind="quiz.result_available",
            ).exists()
        )

    def test_detail_available_emits_web(self):
        from core.mailers.quiz import send_detail_available_email
        send_detail_available_email(self.quiz)
        self.assertTrue(
            Notification.objects.filter(
                user=self.assignee, kind="quiz.detail_available",
            ).exists()
        )

    def test_domain_off_silences_quiz_assignment(self):
        """Owner toggles off quiz.assignment for the whole domain →
        neither bell nor email is fired."""
        from core.mailers.quiz import send_quiz_assignment_email
        from core.models import OutboundEmail
        OutboundEmail.objects.all().delete()
        self.domain.notification_settings = {"quiz.assignment": False}
        self.domain.save(update_fields=["notification_settings"])
        send_quiz_assignment_email(self.quiz)
        self.assertFalse(
            Notification.objects.filter(
                user=self.assignee, kind="quiz.assignment",
            ).exists()
        )
        self.assertEqual(OutboundEmail.objects.count(), 0)
