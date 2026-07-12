"""
Tests for the voluntary leave-domain endpoint
``POST /api/domain/{id}/leave/``.

The action is self-removal: an authenticated user takes themselves out
of a domain's ``members`` (and ``managers``, if applicable). Owners are
refused — they must transfer ownership first.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from domain.models import Domain, JoinPolicy

User = get_user_model()


class DomainLeaveEndpointTests(TestCase):
    URL = "/api/domain/{}/leave/"

    def setUp(self):
        self.owner = User.objects.create_user(email="ow@example.test", password="pwd")
        self.member = User.objects.create_user(email="mb@example.test", password="pwd")
        self.manager = User.objects.create_user(email="mg@example.test", password="pwd")
        self.stranger = User.objects.create_user(email="sg@example.test", password="pwd")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.AUTO,
        )
        self.domain.members.add(self.member, self.manager)
        self.domain.managers.add(self.manager)
        self.client = APIClient()

    def test_leave_requires_authentication(self):
        resp = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_leave(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self.domain.members.filter(pk=self.member.pk).exists())

    def test_manager_leaving_also_drops_manager_role(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self.domain.members.filter(pk=self.manager.pk).exists())
        self.assertFalse(self.domain.managers.filter(pk=self.manager.pk).exists())

    def test_owner_cannot_leave(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(resp.data["detail"], "owner_cannot_leave")
        # Ownership untouched.
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.owner_id, self.owner.id)

    def test_non_member_cannot_leave(self):
        # Non-members get 404 (not 409): the queryset is scoped to
        # owner/managers/members, so a stranger does not even see the
        # domain exists.
        self.client.force_authenticate(self.stranger)
        resp = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_leave_is_idempotent_on_second_call(self):
        self.client.force_authenticate(self.member)
        first = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(first.status_code, status.HTTP_204_NO_CONTENT)
        # After leaving, the user is no longer in the domain's queryset,
        # so the second call 404s — consistent with the non-member case.
        second = self.client.post(self.URL.format(self.domain.id))
        self.assertEqual(second.status_code, status.HTTP_404_NOT_FOUND)
