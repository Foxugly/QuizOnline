"""
Tests for the per-user opt-out mechanism that gates non-critical mails.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from customuser.notifications import (
    KIND_INVITE_RECEIVED,
    KIND_JOIN_REQUEST_CREATED,
    KIND_JOIN_REQUEST_DECIDED,
    NOTIFICATION_KINDS,
    normalize_prefs,
    notification_enabled,
)

User = get_user_model()


class NotificationEnabledTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u", password="p")

    def test_default_is_enabled_for_every_kind(self):
        for kind in NOTIFICATION_KINDS:
            self.assertTrue(notification_enabled(self.user, kind))

    def test_explicit_false_disables(self):
        self.user.notification_prefs = {KIND_JOIN_REQUEST_DECIDED: False}
        self.user.save(update_fields=["notification_prefs"])
        self.assertFalse(notification_enabled(self.user, KIND_JOIN_REQUEST_DECIDED))
        # Other kinds still enabled.
        self.assertTrue(notification_enabled(self.user, KIND_INVITE_RECEIVED))

    def test_explicit_true_is_enabled(self):
        self.user.notification_prefs = {KIND_INVITE_RECEIVED: True}
        self.user.save(update_fields=["notification_prefs"])
        self.assertTrue(notification_enabled(self.user, KIND_INVITE_RECEIVED))

    def test_anonymous_user_is_always_enabled(self):
        from django.contrib.auth.models import AnonymousUser
        self.assertTrue(notification_enabled(AnonymousUser(), KIND_INVITE_RECEIVED))

    def test_none_user_is_always_enabled(self):
        self.assertTrue(notification_enabled(None, KIND_INVITE_RECEIVED))


class NormalizePrefsTests(TestCase):
    """``normalize_prefs`` now stores ``{kind: {channel: False}}``.

    Legacy boolean ``False`` is accepted and translated to
    ``{email: False}`` so older clients / DB rows keep working.
    """

    def test_drops_unknown_keys(self):
        raw = {"bogus.kind": False, KIND_INVITE_RECEIVED: False}
        result = normalize_prefs(raw)
        self.assertEqual(result, {KIND_INVITE_RECEIVED: {"email": False}})

    def test_drops_true_values_to_keep_map_sparse(self):
        raw = {KIND_INVITE_RECEIVED: True, KIND_JOIN_REQUEST_DECIDED: False}
        result = normalize_prefs(raw)
        # True is the default; do not persist it.
        self.assertNotIn(KIND_INVITE_RECEIVED, result)
        self.assertEqual(result[KIND_JOIN_REQUEST_DECIDED], {"email": False})

    def test_non_bool_values_are_ignored(self):
        raw = {KIND_INVITE_RECEIVED: "yes", KIND_JOIN_REQUEST_CREATED: False}
        result = normalize_prefs(raw)
        # Only the explicit False entry survives, translated to the new shape.
        self.assertEqual(result, {KIND_JOIN_REQUEST_CREATED: {"email": False}})

    def test_non_dict_returns_empty(self):
        self.assertEqual(normalize_prefs([1, 2, 3]), {})
        self.assertEqual(normalize_prefs(None), {})
        self.assertEqual(normalize_prefs("hello"), {})


class MailerGateIntegrationTests(TestCase):
    """End-to-end sanity check that the gate actually short-circuits the
    mailers without raising."""

    def setUp(self):
        from django.utils import translation
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.requester = User.objects.create_user(username="r", password="p", email="r@x.test")
        from domain.models import Domain, DomainJoinRequest, JoinPolicy
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.req = DomainJoinRequest.objects.create(domain=self.domain, user=self.requester)

    def test_opted_out_requester_does_not_receive_decided_mail(self):
        from core.mailers.domain_join import send_join_request_approved_email
        from core.models import OutboundEmail
        OutboundEmail.objects.all().delete()
        self.requester.notification_prefs = {KIND_JOIN_REQUEST_DECIDED: False}
        self.requester.save(update_fields=["notification_prefs"])
        send_join_request_approved_email(join_request=self.req)
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_default_requester_receives_decided_mail(self):
        from core.mailers.domain_join import send_join_request_approved_email
        from core.models import OutboundEmail
        OutboundEmail.objects.all().delete()
        send_join_request_approved_email(join_request=self.req)
        self.assertEqual(OutboundEmail.objects.count(), 1)
