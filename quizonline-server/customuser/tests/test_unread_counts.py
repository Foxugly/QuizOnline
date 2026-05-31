"""
Tests for the coalesced ``/api/unread-counts/`` endpoint.

The endpoint returns the same two numbers as the dedicated
``/api/notification/unread-count/`` and ``/api/quiz/alerts/unread-count/``
endpoints, in a single response. These tests verify the contract
and that user-scoping is respected.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from customuser.models import Notification

User = get_user_model()


class UnreadCountsAnonymousTests(TestCase):
    URL = "/api/unread-counts/"

    def test_anonymous_is_401(self):
        resp = APIClient().get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class UnreadCountsNotificationOnlyTests(TestCase):
    URL = "/api/unread-counts/"

    def setUp(self):
        self.user = User.objects.create_user(username="u", password="p")
        # 2 unread + 1 read + 1 deleted — only the 2 unread should count.
        Notification.objects.create(user=self.user, kind="a")
        Notification.objects.create(user=self.user, kind="b")
        read = Notification.objects.create(user=self.user, kind="c")
        read.read_at = read.created_at
        read.save(update_fields=["read_at"])
        deleted = Notification.objects.create(user=self.user, kind="d")
        deleted.deleted_at = deleted.created_at
        deleted.save(update_fields=["deleted_at"])
        # Another user's rows must not leak.
        other = User.objects.create_user(username="o", password="p")
        Notification.objects.create(user=other, kind="x")

        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_counts_notifications_correctly(self):
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"notifications": 2, "quiz_alerts": 0})

    def test_response_shape_is_stable(self):
        resp = self.client.get(self.URL)
        # Contract: both keys present, both integers, no surprises.
        self.assertEqual(set(resp.data.keys()), {"notifications", "quiz_alerts"})
        for value in resp.data.values():
            self.assertIsInstance(value, int)


class UnreadCountsEmptyTests(TestCase):
    URL = "/api/unread-counts/"

    def test_no_data_returns_zeros(self):
        user = User.objects.create_user(username="u", password="p")
        client = APIClient()
        client.force_authenticate(user)
        resp = client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"notifications": 0, "quiz_alerts": 0})
