# Domain Join Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-domain `join_policy` (auto / owner / owner_managers) and the supporting `DomainJoinRequest` workflow so that joining a domain can require explicit approval, with email notifications and a clean audit trail.

**Architecture:**
- New `JoinPolicy` enum on `Domain` (default `auto`, fully backward-compatible).
- New `DomainJoinRequest` model with a partial unique constraint enforcing one pending request per `(domain, user)`.
- New nested REST endpoints under `/api/domain/{domain_id}/join-request/...` for create/list/approve/reject/cancel, plus `/api/user/me/join-requests/` for the requester's own pending list.
- Two existing self-link flows (`CustomUserCreateSerializer.create`, `CustomUserProfileUpdateSerializer.update`) get split via a shared helper that adds `auto` domains directly and creates a pending request for `validation` domains.
- Three new mailer functions added to `core/mailers/domain_join.py`, following the **same dict-per-language pattern** already used by `core/mailers/registration.py` (no Django templates — there is no `core/templates/mailers/` directory in this codebase).

**Tech Stack:** Django 5, DRF, parler (for the existing translatable `Domain.name`), `OutboundEmail` outbox already in `core/`, `manage.py test` runner against in-memory SQLite.

**Spec reference:** `docs/superpowers/specs/2026-04-11-domain-join-policy-design.md`

---

## File Map

**New files**

| Path | Responsibility |
|---|---|
| `quizonline-server/domain/migrations/0005_join_policy_and_join_request.py` | Add `Domain.join_policy` column + `DomainJoinRequest` table + indexes + partial unique constraint |
| `quizonline-server/domain/services.py` | Helper functions: `users_who_can_approve(domain)`, `auto_approve_pending_requests(domain, *, by)`, `flip_pending_to_approved(domain, user, *, by)`. Pure functions called from views/serializers. |
| `quizonline-server/customuser/services.py` (modify if exists, create otherwise) | Helper `reconcile_user_domain_membership(user, target_ids, *, requester=None)` shared by registration and profile-update serializers |
| `quizonline-server/core/mailers/domain_join.py` | Three mailer functions: `send_join_request_created_email`, `send_join_request_approved_email`, `send_join_request_rejected_email`. Same dict-per-language style as `registration.py`. |
| `quizonline-server/domain/tests/test_join_request_views.py` | Test class for all the new endpoints (create / list / approve / reject / cancel / me listing / policy transition / member_role race) |
| `quizonline-server/domain/tests/test_join_request_models.py` | Model-level tests (default value, partial unique constraint) |

**Modified files**

| Path | Change |
|---|---|
| `quizonline-server/domain/models.py` | Add `JoinPolicy` `TextChoices`, `Domain.join_policy` field, `DomainJoinRequest` model |
| `quizonline-server/domain/serializers.py` | Extend `DomainReadSerializer` (add `join_policy`, `pending_join_requests_count`, `my_join_request_status`); extend `DomainWriteSerializer` (writable `join_policy` gated to owner); add `DomainJoinRequestReadSerializer`, `DomainJoinRequestRejectSerializer` |
| `quizonline-server/domain/views.py` | Add `DomainJoinRequestViewSet`; modify `DomainViewSet.update`/`partial_update` to handle the auto-approval transition; modify `member_role` to flip pending → approved on admin push |
| `quizonline-server/domain/permissions.py` | Add `CanApproveJoinRequest` |
| `quizonline-server/domain/api_urls.py` | Wire the new viewset routes (explicit `path()` entries appended to `router.urls`) |
| `quizonline-server/customuser/serializers.py` | Use the new helper from `customuser/services.py` in `CustomUserCreateSerializer.create` and `CustomUserProfileUpdateSerializer.update`; add `pending_join_requests` to `CustomUserReadSerializer` |
| `quizonline-server/customuser/views.py` | Add `me_join_requests` action on `CustomUserViewSet` (URL `/api/user/me/join-requests/`) |

---

## Conventions used in every task

- **Test runner:** from repo root, `cd quizonline-server && ../.venv/Scripts/python.exe manage.py test <module> -v 2`
- **Tests are TDD:** every task starts by adding a failing test, runs it to confirm the failure, then writes the minimal implementation, then re-runs the test, then commits.
- **Commits:** conventional, scoped messages. Co-author trailer omitted in this plan but you may add `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` per project convention.
- **Imports & boilerplate:** when a code block shows a new function or class, assume the necessary imports must be added at the top of the file. Always check the existing imports first to avoid duplicates.

---

## Task 1: Add `JoinPolicy` enum and `Domain.join_policy` field

**Files:**
- Modify: `quizonline-server/domain/models.py`
- Create: `quizonline-server/domain/migrations/0005_join_policy_and_join_request.py` (this single migration covers Tasks 1 + 2)
- Test: `quizonline-server/domain/tests/test_join_request_models.py` (new file)

- [ ] **Step 1.1: Create the test file with a failing default-value test**

Create `quizonline-server/domain/tests/test_join_request_models.py`:

```python
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import translation

from domain.models import Domain

User = get_user_model()


class DomainJoinPolicyTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd")

    def test_join_policy_defaults_to_auto(self):
        domain = Domain.objects.create(owner=self.owner, name="D1", description="", active=True)
        self.assertEqual(domain.join_policy, "auto")
```

- [ ] **Step 1.2: Run the test and confirm it fails**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_models -v 2
```

Expected: `AttributeError: 'Domain' object has no attribute 'join_policy'` (or migration error).

- [ ] **Step 1.3: Add the `JoinPolicy` enum and field on `Domain`**

In `quizonline-server/domain/models.py`, add the enum near the top of the file (after the imports, before the `Domain` class) and the field inside `Domain`:

```python
class JoinPolicy(models.TextChoices):
    AUTO = "auto", _("Automatic")
    OWNER = "owner", _("Owner validation")
    OWNER_MANAGERS = "owner_managers", _("Owner or managers validation")
```

Inside the `Domain` class, add the field next to the other simple fields (e.g. just below `active`):

```python
join_policy = models.CharField(
    max_length=20,
    choices=JoinPolicy.choices,
    default=JoinPolicy.AUTO,
)
```

- [ ] **Step 1.4: Create the migration (column only; the model from Task 2 will be added in the same migration there)**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py makemigrations domain --name join_policy_and_join_request
```

Verify the generated file at `quizonline-server/domain/migrations/0005_join_policy_and_join_request.py` contains an `AddField` operation for `join_policy`. Do NOT run migrate — Task 2 will append the new model to the same migration.

- [ ] **Step 1.5: Run the test to confirm it passes**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_models -v 2
```

Expected: `OK` (1 test).

- [ ] **Step 1.6: Commit**

```bash
git add quizonline-server/domain/models.py quizonline-server/domain/migrations/0005_join_policy_and_join_request.py quizonline-server/domain/tests/test_join_request_models.py
git commit -m "feat(domain): add JoinPolicy enum and Domain.join_policy field"
```

---

## Task 2: Add `DomainJoinRequest` model

**Files:**
- Modify: `quizonline-server/domain/models.py`
- Modify: `quizonline-server/domain/migrations/0005_join_policy_and_join_request.py` (regenerated by makemigrations)
- Test: `quizonline-server/domain/tests/test_join_request_models.py`

- [ ] **Step 2.1: Add the failing constraint test**

Append to `quizonline-server/domain/tests/test_join_request_models.py`:

```python
from domain.models import DomainJoinRequest


class DomainJoinRequestModelTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner2", password="pwd")
        self.user = User.objects.create_user(username="joiner", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="D2", description="", active=True)

    def test_default_status_is_pending(self):
        req = DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        self.assertEqual(req.status, "pending")

    def test_partial_unique_constraint_blocks_second_pending(self):
        DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                DomainJoinRequest.objects.create(domain=self.domain, user=self.user)

    def test_partial_unique_allows_new_pending_after_rejection(self):
        first = DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        first.status = DomainJoinRequest.STATUS_REJECTED
        first.save(update_fields=["status"])
        # Should not raise — the partial unique only applies to status="pending".
        DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
```

- [ ] **Step 2.2: Run, confirm failure**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_models -v 2
```

Expected: `ImportError: cannot import name 'DomainJoinRequest' from 'domain.models'`.

- [ ] **Step 2.3: Add the `DomainJoinRequest` model in `quizonline-server/domain/models.py`**

Append at the end of the file (after `Domain`):

```python
class DomainJoinRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending")),
        (STATUS_APPROVED, _("Approved")),
        (STATUS_REJECTED, _("Rejected")),
        (STATUS_CANCELLED, _("Cancelled")),
    ]

    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name="join_requests",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="domain_join_requests",
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    decided_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="decided_domain_join_requests",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, max_length=500)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["domain", "user"],
                condition=models.Q(status="pending"),
                name="uniq_pending_join_request_per_domain_user",
            ),
        ]
        indexes = [
            models.Index(fields=["domain", "status"], name="dom_join_req_dom_st_idx"),
            models.Index(fields=["user", "status"], name="dom_join_req_user_st_idx"),
        ]
        ordering = ["-created_at"]
```

- [ ] **Step 2.4: Regenerate the migration to include the new model**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py makemigrations domain --name join_policy_and_join_request
```

If makemigrations refuses because a `0005_*` already exists with the same name, delete the previous file first:
```bash
rm quizonline-server/domain/migrations/0005_join_policy_and_join_request.py
cd quizonline-server && ../.venv/Scripts/python.exe manage.py makemigrations domain --name join_policy_and_join_request
```

Verify the resulting migration file contains BOTH `AddField` (for `Domain.join_policy`) AND `CreateModel` (for `DomainJoinRequest`) AND the partial `UniqueConstraint`.

- [ ] **Step 2.5: Run the tests to confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_models -v 2
```

Expected: `OK` (4 tests).

- [ ] **Step 2.6: Commit**

```bash
git add quizonline-server/domain/models.py quizonline-server/domain/migrations/0005_join_policy_and_join_request.py quizonline-server/domain/tests/test_join_request_models.py
git commit -m "feat(domain): add DomainJoinRequest model with partial unique constraint"
```

---

## Task 3: Expose `join_policy` on `DomainReadSerializer` (basic only — computed fields come in Task 16)

**Files:**
- Modify: `quizonline-server/domain/serializers.py`
- Test: `quizonline-server/domain/tests/tests_serializers.py` (existing file; add a new test class at the end)

- [ ] **Step 3.1: Locate the existing test file**

```bash
ls quizonline-server/domain/tests/
```

If `tests_serializers.py` does not exist, create it with the standard `TestCase` boilerplate (translation.activate, etc.). Otherwise, append to it.

- [ ] **Step 3.2: Add a failing serializer test**

Append at the end of `quizonline-server/domain/tests/tests_serializers.py` (create it if missing — copy boilerplate from `quizonline-server/domain/tests/test_views.py` as a reference):

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation

from domain.models import Domain
from domain.serializers import DomainReadSerializer

User = get_user_model()


class DomainReadSerializerJoinPolicyTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="D", description="", active=True)

    def test_join_policy_field_is_serialized(self):
        data = DomainReadSerializer(self.domain).data
        self.assertEqual(data["join_policy"], "auto")
```

- [ ] **Step 3.3: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainReadSerializerJoinPolicyTests -v 2
```

Expected: `KeyError: 'join_policy'`.

- [ ] **Step 3.4: Add `join_policy` to `DomainReadSerializer.Meta.fields`**

In `quizonline-server/domain/serializers.py`, locate `class DomainReadSerializer` and add `"join_policy"` to its `Meta.fields` tuple. The field is a regular Django CharField with choices, so DRF picks it up automatically — no SerializerMethodField needed.

- [ ] **Step 3.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainReadSerializerJoinPolicyTests -v 2
```

Expected: `OK`.

- [ ] **Step 3.6: Commit**

```bash
git add quizonline-server/domain/serializers.py quizonline-server/domain/tests/tests_serializers.py
git commit -m "feat(domain): expose join_policy on DomainReadSerializer"
```

---

## Task 4: Make `join_policy` writable on `DomainWriteSerializer`, gated to owner

**Files:**
- Modify: `quizonline-server/domain/serializers.py`
- Test: `quizonline-server/domain/tests/tests_serializers.py`

- [ ] **Step 4.1: Add the failing test**

Append to `quizonline-server/domain/tests/tests_serializers.py`:

```python
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory

from domain.serializers import DomainWriteSerializer


class DomainWriteSerializerJoinPolicyTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="pwd")
        self.manager = User.objects.create_user(username="m", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="D", description="", active=True)
        self.domain.managers.add(self.manager)
        self.factory = APIRequestFactory()

    def _ctx(self, user):
        request = self.factory.patch(f"/api/domain/{self.domain.id}/")
        request.user = user
        return {"request": request}

    def test_owner_can_change_join_policy(self):
        s = DomainWriteSerializer(
            instance=self.domain,
            data={"join_policy": "owner"},
            partial=True,
            context=self._ctx(self.owner),
        )
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.join_policy, "owner")

    def test_manager_cannot_change_join_policy(self):
        s = DomainWriteSerializer(
            instance=self.domain,
            data={"join_policy": "owner"},
            partial=True,
            context=self._ctx(self.manager),
        )
        with self.assertRaises(PermissionDenied):
            s.is_valid(raise_exception=True)
            s.save()
```

- [ ] **Step 4.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainWriteSerializerJoinPolicyTests -v 2
```

Expected: failures (the field is unknown OR no permission check exists).

- [ ] **Step 4.3: Implement on `DomainWriteSerializer`**

In `quizonline-server/domain/serializers.py`, locate `DomainWriteSerializer` and:

1. Add `"join_policy"` to its `Meta.fields`.
2. Add a `validate_join_policy` method that requires the requesting user to be the owner or a superuser:

```python
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

class DomainWriteSerializer(...):
    # ... existing fields ...

    def validate_join_policy(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise DRFPermissionDenied("Authentication required.")
        if getattr(user, "is_superuser", False):
            return value
        if self.instance is None:
            # Creation: anyone authorized to create a domain may set the policy.
            return value
        if self.instance.owner_id != user.id:
            raise DRFPermissionDenied("Only the domain owner can change the join policy.")
        return value
```

- [ ] **Step 4.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainWriteSerializerJoinPolicyTests -v 2
```

Expected: `OK` (2 tests).

- [ ] **Step 4.5: Commit**

```bash
git add quizonline-server/domain/serializers.py quizonline-server/domain/tests/tests_serializers.py
git commit -m "feat(domain): allow owner to set join_policy via DomainWriteSerializer"
```

---

## Task 5: Add `CanApproveJoinRequest` permission class

**Files:**
- Modify: `quizonline-server/domain/permissions.py`
- Test: in the new `quizonline-server/domain/tests/test_join_request_views.py` (we'll add a unit-style test for the permission alone)

- [ ] **Step 5.1: Create the test file with the failing permission test**

Create `quizonline-server/domain/tests/test_join_request_views.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework.test import APIRequestFactory

from domain.models import Domain, JoinPolicy
from domain.permissions import CanApproveJoinRequest

User = get_user_model()


class CanApproveJoinRequestTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd")
        self.manager = User.objects.create_user(username="mgr", password="pwd")
        self.stranger = User.objects.create_user(username="stranger", password="pwd")
        self.superuser = User.objects.create_user(username="root", password="pwd", is_superuser=True, is_staff=True)
        self.domain = Domain.objects.create(owner=self.owner, name="D", description="", active=True)
        self.domain.managers.add(self.manager)
        self.factory = APIRequestFactory()
        self.perm = CanApproveJoinRequest()

    def _req(self, user):
        r = self.factory.get("/")
        r.user = user
        return r

    def test_owner_always_allowed(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(self.perm.has_object_permission(self._req(self.owner), None, self.domain))

    def test_manager_allowed_only_when_policy_is_owner_managers(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertFalse(self.perm.has_object_permission(self._req(self.manager), None, self.domain))

        self.domain.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(self.perm.has_object_permission(self._req(self.manager), None, self.domain))

    def test_stranger_never_allowed(self):
        for policy in (JoinPolicy.OWNER, JoinPolicy.OWNER_MANAGERS, JoinPolicy.AUTO):
            self.domain.join_policy = policy
            self.domain.save(update_fields=["join_policy"])
            self.assertFalse(self.perm.has_object_permission(self._req(self.stranger), None, self.domain))

    def test_superuser_always_allowed(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(self.perm.has_object_permission(self._req(self.superuser), None, self.domain))
```

- [ ] **Step 5.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.CanApproveJoinRequestTests -v 2
```

Expected: `ImportError: cannot import name 'CanApproveJoinRequest'`.

- [ ] **Step 5.3: Implement the permission**

In `quizonline-server/domain/permissions.py`, append:

```python
from domain.models import JoinPolicy


class CanApproveJoinRequest(BasePermission):
    """
    Object-level permission for the domain on which a join request lives.
    Authorized: superuser; the domain owner (always); a domain manager
    only if the policy is `owner_managers`.
    """

    def has_object_permission(self, request, view, obj):
        from config.permissions import is_authenticated_user

        user = request.user
        if not is_authenticated_user(user):
            return False
        if getattr(user, "is_superuser", False):
            return True
        if obj.owner_id == user.id:
            return True
        if obj.join_policy == JoinPolicy.OWNER_MANAGERS:
            return obj.managers.filter(id=user.id).exists()
        return False
```

- [ ] **Step 5.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.CanApproveJoinRequestTests -v 2
```

Expected: `OK` (4 tests).

- [ ] **Step 5.5: Commit**

```bash
git add quizonline-server/domain/permissions.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): add CanApproveJoinRequest permission class"
```

---

## Task 6: Implement `POST /api/domain/{id}/join-request/` (create endpoint, both branches, with mailer)

This is the heaviest task. It introduces the viewset, the mailer module, and the URL wiring.

**Files:**
- Modify: `quizonline-server/domain/views.py`
- Modify: `quizonline-server/domain/serializers.py`
- Modify: `quizonline-server/domain/api_urls.py`
- Create: `quizonline-server/core/mailers/domain_join.py`
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 6.1: Add failing API tests for the create endpoint**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from domain.models import DomainJoinRequest, JoinPolicy


class JoinRequestCreateEndpointTests(TestCase):
    URL = "/api/domain/{}/join-request/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd", email="o@x.test")
        self.manager = User.objects.create_user(username="mg", password="pwd", email="m@x.test")
        self.joiner = User.objects.create_user(username="jo", password="pwd", email="j@x.test")
        self.member = User.objects.create_user(username="me", password="pwd")
        self.domain_auto = Domain.objects.create(owner=self.owner, name="A", description="", active=True)
        self.domain_validation = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain_validation.join_policy = JoinPolicy.OWNER
        self.domain_validation.save(update_fields=["join_policy"])
        self.domain_validation.members.add(self.member)
        self.domain_inactive = Domain.objects.create(owner=self.owner, name="I", description="", active=False)
        self.client = APIClient()

    def test_post_on_auto_domain_links_directly_no_record(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_auto.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "approved")
        self.assertIsNone(res.data["request"])
        self.assertTrue(self.domain_auto.members.filter(pk=self.joiner.pk).exists())
        self.assertEqual(DomainJoinRequest.objects.filter(domain=self.domain_auto, user=self.joiner).count(), 0)

    def test_post_on_validation_domain_creates_pending(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "pending")
        self.assertIsNotNone(res.data["request"])
        req = DomainJoinRequest.objects.get(domain=self.domain_validation, user=self.joiner)
        self.assertEqual(req.status, "pending")
        # Email enqueued for the owner.
        self.assertTrue(OutboundEmail.objects.filter(recipients__contains=[self.owner.email]).exists())

    def test_post_validation_domain_idempotent_returns_existing_pending(self):
        self.client.force_authenticate(user=self.joiner)
        first = self.client.post(self.URL.format(self.domain_validation.id))
        second = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["request"]["id"], first.data["request"]["id"])
        self.assertEqual(DomainJoinRequest.objects.filter(domain=self.domain_validation, user=self.joiner).count(), 1)

    def test_post_when_already_member_returns_409(self):
        self.client.force_authenticate(user=self.member)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_post_when_owner_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_on_inactive_domain_returns_404(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_inactive.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_owner_managers_policy_emails_owner_and_managers(self):
        self.domain_validation.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain_validation.save(update_fields=["join_policy"])
        self.domain_validation.managers.add(self.manager)
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        recipients = set()
        for outbound in OutboundEmail.objects.all():
            recipients.update(outbound.recipients)
        self.assertIn(self.owner.email, recipients)
        self.assertIn(self.manager.email, recipients)
```

- [ ] **Step 6.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestCreateEndpointTests -v 2
```

Expected: 404 / NoReverseMatch on every test (the URL is not wired).

- [ ] **Step 6.3: Create the mailer module**

Create `quizonline-server/core/mailers/domain_join.py`:

```python
from django.conf import settings

from core.mailers._common import (
    queue_plaintext_email,
    send_user_plaintext_email,
    user_language,
)


def _domain_join_copy(language_code: str) -> dict[str, str]:
    app = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "request_subject": f"{app} - nouvelle demande d'acces a votre domaine",
            "request_intro": "Un utilisateur a demande a rejoindre votre domaine",
            "request_action": "Vous pouvez approuver ou refuser cette demande dans l'interface.",
            "approved_subject": f"{app} - votre demande d'acces a ete approuvee",
            "approved_body": "Votre demande d'acces au domaine \"{domain}\" a ete approuvee. Vous etes maintenant membre.",
            "rejected_subject": f"{app} - votre demande d'acces a ete refusee",
            "rejected_body": "Votre demande d'acces au domaine \"{domain}\" a ete refusee.",
            "rejected_reason_label": "Motif :",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "request_subject": f"{app} - nieuwe toegangsaanvraag voor uw domein",
            "request_intro": "Een gebruiker heeft toegang gevraagd tot uw domein",
            "request_action": "U kunt deze aanvraag goedkeuren of afwijzen in de interface.",
            "approved_subject": f"{app} - uw toegangsaanvraag is goedgekeurd",
            "approved_body": "Uw toegangsaanvraag voor het domein \"{domain}\" is goedgekeurd. U bent nu lid.",
            "rejected_subject": f"{app} - uw toegangsaanvraag is afgewezen",
            "rejected_body": "Uw toegangsaanvraag voor het domein \"{domain}\" is afgewezen.",
            "rejected_reason_label": "Reden:",
        }
    return {
        "greeting": "Hello",
        "request_subject": f"{app} - new join request on your domain",
        "request_intro": "A user has requested to join your domain",
        "request_action": "You can approve or reject this request from the interface.",
        "approved_subject": f"{app} - your join request was approved",
        "approved_body": "Your join request on \"{domain}\" was approved. You are now a member.",
        "rejected_subject": f"{app} - your join request was rejected",
        "rejected_body": "Your join request on \"{domain}\" was rejected.",
        "rejected_reason_label": "Reason:",
    }


def _domain_name_for(domain, recipient) -> str:
    return domain.safe_translation_getter(
        "name",
        language_code=user_language(recipient),
        any_language=True,
    ) or f"Domain#{domain.pk}"


def send_join_request_created_email(*, join_request, recipients) -> None:
    """recipients: iterable of approver Users (owner + maybe managers)."""
    domain = join_request.domain
    requester = join_request.user
    for recipient in recipients:
        if not getattr(recipient, "email", ""):
            continue
        send_user_plaintext_email(
            user=recipient,
            subject_builder=lambda u: _domain_join_copy(user_language(u))["request_subject"],
            body_builder=lambda u: _build_request_body(u, requester=requester, domain=domain),
        )


def _build_request_body(recipient, *, requester, domain) -> str:
    copy = _domain_join_copy(user_language(recipient))
    domain_name = _domain_name_for(domain, recipient)
    requester_name = getattr(requester, "get_display_name", lambda: requester.username)()
    return (
        f"{copy['greeting']} {recipient.get_display_name()},\n\n"
        f"{copy['request_intro']} \"{domain_name}\" : {requester_name} ({requester.email}).\n"
        f"{copy['request_action']}\n"
    )


def send_join_request_approved_email(*, join_request) -> None:
    domain = join_request.domain
    requester = join_request.user
    if not requester.email:
        return
    send_user_plaintext_email(
        user=requester,
        subject_builder=lambda u: _domain_join_copy(user_language(u))["approved_subject"],
        body_builder=lambda u: (
            f"{_domain_join_copy(user_language(u))['greeting']} {u.get_display_name()},\n\n"
            + _domain_join_copy(user_language(u))["approved_body"].format(
                domain=_domain_name_for(domain, u)
            ) + "\n"
        ),
    )


def send_join_request_rejected_email(*, join_request) -> None:
    domain = join_request.domain
    requester = join_request.user
    reason = (join_request.reject_reason or "").strip()
    if not requester.email:
        return

    def body_builder(u):
        copy = _domain_join_copy(user_language(u))
        body = (
            f"{copy['greeting']} {u.get_display_name()},\n\n"
            + copy["rejected_body"].format(domain=_domain_name_for(domain, u))
        )
        if reason:
            body += f"\n\n{copy['rejected_reason_label']} {reason}"
        return body + "\n"

    send_user_plaintext_email(
        user=requester,
        subject_builder=lambda u: _domain_join_copy(user_language(u))["rejected_subject"],
        body_builder=body_builder,
    )
```

- [ ] **Step 6.4: Add the read serializer for `DomainJoinRequest`**

In `quizonline-server/domain/serializers.py`, append:

```python
from domain.models import DomainJoinRequest


class DomainJoinRequestReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DomainJoinRequest
        fields = (
            "id",
            "domain",
            "user",
            "status",
            "decided_by",
            "decided_at",
            "reject_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
```

- [ ] **Step 6.5: Implement the helper for resolving approvers**

Create `quizonline-server/domain/services.py`:

```python
from __future__ import annotations

from django.contrib.auth import get_user_model

from domain.models import Domain, DomainJoinRequest, JoinPolicy

User = get_user_model()


def users_who_can_approve(domain: Domain) -> list:
    """Owner + managers (if policy is owner_managers). De-duplicated."""
    approvers = {domain.owner}
    if domain.join_policy == JoinPolicy.OWNER_MANAGERS:
        approvers.update(domain.managers.all())
    return [u for u in approvers if u is not None]
```

- [ ] **Step 6.6: Implement the viewset (create only in this task; further actions in subsequent tasks)**

In `quizonline-server/domain/views.py`, append (after `DomainViewSet`):

```python
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.generics import get_object_or_404 as drf_get_object_or_404

from domain.models import DomainJoinRequest, JoinPolicy
from domain.serializers import DomainJoinRequestReadSerializer
from domain.services import users_who_can_approve
from core.mailers.domain_join import send_join_request_created_email


class DomainJoinRequestViewSet(viewsets.GenericViewSet):
    """
    Nested under /api/domain/{domain_id}/join-request/.
    """
    serializer_class = DomainJoinRequestReadSerializer
    queryset = DomainJoinRequest.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    lookup_url_kwarg = "req_id"

    def _get_domain(self):
        domain = drf_get_object_or_404(
            Domain.objects.filter(active=True),
            pk=self.kwargs["domain_id"],
        )
        return domain

    def create(self, request, *args, **kwargs):
        domain = self._get_domain()
        user = request.user

        if domain.owner_id == user.id:
            return Response(
                {"detail": "already_owner"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if domain.members.filter(pk=user.pk).exists():
            return Response(
                {"detail": "already_member"},
                status=status.HTTP_409_CONFLICT,
            )

        if domain.join_policy == JoinPolicy.AUTO:
            domain.members.add(user)
            return Response(
                {"status": "approved", "request": None},
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            existing = (
                DomainJoinRequest.objects
                .select_for_update()
                .filter(domain=domain, user=user, status=DomainJoinRequest.STATUS_PENDING)
                .first()
            )
            if existing:
                return Response(
                    {
                        "status": "pending",
                        "request": DomainJoinRequestReadSerializer(existing).data,
                    },
                    status=status.HTTP_200_OK,
                )
            join_request = DomainJoinRequest.objects.create(
                domain=domain,
                user=user,
                status=DomainJoinRequest.STATUS_PENDING,
            )
            transaction.on_commit(
                lambda: send_join_request_created_email(
                    join_request=join_request,
                    recipients=users_who_can_approve(domain),
                )
            )

        return Response(
            {
                "status": "pending",
                "request": DomainJoinRequestReadSerializer(join_request).data,
            },
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 6.7: Wire the URL**

In `quizonline-server/domain/api_urls.py`, replace the contents with:

```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DomainJoinRequestViewSet, DomainViewSet

app_name = "domain-api"

router = DefaultRouter()
router.register(r"", DomainViewSet, basename="domain")

join_request_create = DomainJoinRequestViewSet.as_view({"post": "create"})

urlpatterns = router.urls + [
    path(
        "<int:domain_id>/join-request/",
        join_request_create,
        name="domain-join-request-create",
    ),
]
```

- [ ] **Step 6.8: Run the create tests, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestCreateEndpointTests -v 2
```

Expected: `OK` (7 tests).

- [ ] **Step 6.9: Run the full domain test suite to catch regressions**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain -v 2
```

Expected: `OK`.

- [ ] **Step 6.10: Commit**

```bash
git add quizonline-server/domain/views.py quizonline-server/domain/serializers.py quizonline-server/domain/api_urls.py quizonline-server/domain/services.py quizonline-server/core/mailers/domain_join.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): POST /domain/{id}/join-request/ create endpoint with mailer"
```

---

## Task 7: Implement `GET .../join-request/` and `GET .../join-request/{id}/` (list + retrieve, with status filter)

**Files:**
- Modify: `quizonline-server/domain/views.py`
- Modify: `quizonline-server/domain/api_urls.py`
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 7.1: Add failing list/retrieve tests**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
class JoinRequestListRetrieveTests(TestCase):
    URL_LIST = "/api/domain/{}/join-request/"
    URL_DETAIL = "/api/domain/{}/join-request/{}/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd", email="o@x.test")
        self.manager = User.objects.create_user(username="mg", password="pwd", email="m@x.test")
        self.stranger = User.objects.create_user(username="st", password="pwd")
        self.joiner = User.objects.create_user(username="jo", password="pwd", email="j@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.domain.managers.add(self.manager)
        self.pending = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)
        self.client = APIClient()

    def test_owner_can_list(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self.URL_LIST.format(self.domain.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data]
        self.assertIn(self.pending.id, ids)

    def test_manager_cannot_list_when_policy_is_owner(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get(self.URL_LIST.format(self.domain.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_list_when_policy_is_owner_managers(self):
        self.domain.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain.save(update_fields=["join_policy"])
        self.client.force_authenticate(user=self.manager)
        res = self.client.get(self.URL_LIST.format(self.domain.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_stranger_cannot_list(self):
        self.client.force_authenticate(user=self.stranger)
        res = self.client.get(self.URL_LIST.format(self.domain.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_filter(self):
        # Create one rejected request to test the filter
        rejected = DomainJoinRequest.objects.create(domain=self.domain, user=self.stranger)
        rejected.status = DomainJoinRequest.STATUS_REJECTED
        rejected.save(update_fields=["status"])
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self.URL_LIST.format(self.domain.id) + "?status=pending")
        ids = [item["id"] for item in res.data]
        self.assertIn(self.pending.id, ids)
        self.assertNotIn(rejected.id, ids)

    def test_retrieve_owner_ok(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(self.URL_DETAIL.format(self.domain.id, self.pending.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], self.pending.id)
```

- [ ] **Step 7.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestListRetrieveTests -v 2
```

Expected: 404 on every test (URLs not wired) or 200 unscoped.

- [ ] **Step 7.3: Add `list` and `retrieve` to `DomainJoinRequestViewSet`**

In `quizonline-server/domain/views.py`, inside `DomainJoinRequestViewSet`, add:

```python
from domain.permissions import CanApproveJoinRequest


def get_queryset(self):
    qs = DomainJoinRequest.objects.filter(domain_id=self.kwargs["domain_id"])
    status_filter = self.request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)
    return qs.select_related("user", "decided_by", "domain").order_by("-created_at")


def list(self, request, *args, **kwargs):
    domain = self._get_domain()
    self._check_can_approve(domain)
    qs = self.get_queryset()
    return Response(DomainJoinRequestReadSerializer(qs, many=True).data)


def retrieve(self, request, *args, **kwargs):
    domain = self._get_domain()
    self._check_can_approve(domain)
    obj = drf_get_object_or_404(self.get_queryset(), pk=self.kwargs["req_id"])
    return Response(DomainJoinRequestReadSerializer(obj).data)


def _check_can_approve(self, domain):
    perm = CanApproveJoinRequest()
    if not perm.has_object_permission(self.request, self, domain):
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        raise DRFPermissionDenied()
```

- [ ] **Step 7.4: Wire the URLs**

In `quizonline-server/domain/api_urls.py`, extend the bindings:

```python
join_request_create = DomainJoinRequestViewSet.as_view({"get": "list", "post": "create"})
join_request_detail = DomainJoinRequestViewSet.as_view({"get": "retrieve"})

urlpatterns = router.urls + [
    path(
        "<int:domain_id>/join-request/",
        join_request_create,
        name="domain-join-request-list",
    ),
    path(
        "<int:domain_id>/join-request/<int:req_id>/",
        join_request_detail,
        name="domain-join-request-detail",
    ),
]
```

- [ ] **Step 7.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestListRetrieveTests -v 2
```

Expected: `OK` (6 tests).

- [ ] **Step 7.6: Commit**

```bash
git add quizonline-server/domain/views.py quizonline-server/domain/api_urls.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): list/retrieve join requests with status filter and approver permission"
```

---

## Task 8: Implement `approve` and `reject` actions (with mailers)

**Files:**
- Modify: `quizonline-server/domain/views.py`
- Modify: `quizonline-server/domain/api_urls.py`
- Modify: `quizonline-server/domain/serializers.py` (add `DomainJoinRequestRejectSerializer`)
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 8.1: Add failing tests for approve and reject**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
class JoinRequestApproveRejectTests(TestCase):
    URL_APPROVE = "/api/domain/{}/join-request/{}/approve/"
    URL_REJECT = "/api/domain/{}/join-request/{}/reject/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd", email="o@x.test")
        self.manager = User.objects.create_user(username="mg", password="pwd", email="m@x.test")
        self.joiner = User.objects.create_user(username="jo", password="pwd", email="j@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.req = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)
        self.client = APIClient()

    def test_owner_approves_adds_member_and_emails(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL_APPROVE.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "approved")
        self.assertEqual(self.req.decided_by_id, self.owner.id)
        self.assertIsNotNone(self.req.decided_at)
        self.assertTrue(self.domain.members.filter(pk=self.joiner.pk).exists())
        self.assertTrue(OutboundEmail.objects.filter(recipients__contains=[self.joiner.email]).exists())

    def test_manager_cannot_approve_under_owner_policy(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(self.URL_APPROVE.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "pending")

    def test_manager_can_approve_under_owner_managers_policy(self):
        self.domain.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain.save(update_fields=["join_policy"])
        self.domain.managers.add(self.manager)
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(self.URL_APPROVE.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.decided_by_id, self.manager.id)

    def test_owner_rejects_with_reason(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            self.URL_REJECT.format(self.domain.id, self.req.id),
            {"reason": "not in the org"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "rejected")
        self.assertEqual(self.req.reject_reason, "not in the org")
        self.assertFalse(self.domain.members.filter(pk=self.joiner.pk).exists())
        self.assertTrue(OutboundEmail.objects.filter(recipients__contains=[self.joiner.email]).exists())

    def test_reject_without_reason_is_allowed(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL_REJECT.format(self.domain.id, self.req.id), {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.reject_reason, "")

    def test_cannot_approve_a_non_pending_request(self):
        self.req.status = DomainJoinRequest.STATUS_REJECTED
        self.req.save(update_fields=["status"])
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL_APPROVE.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
```

- [ ] **Step 8.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestApproveRejectTests -v 2
```

Expected: 404 on each test (the URLs are not wired yet).

- [ ] **Step 8.3: Add the reject input serializer**

In `quizonline-server/domain/serializers.py`, append:

```python
class DomainJoinRequestRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")
```

- [ ] **Step 8.4: Implement the actions on the viewset**

In `quizonline-server/domain/views.py`, inside `DomainJoinRequestViewSet`, add:

```python
from django.utils import timezone

from core.mailers.domain_join import (
    send_join_request_approved_email,
    send_join_request_rejected_email,
)
from domain.serializers import DomainJoinRequestRejectSerializer


@action(detail=True, methods=["post"], url_path="approve")
def approve(self, request, *args, **kwargs):
    domain = self._get_domain()
    self._check_can_approve(domain)
    join_request = drf_get_object_or_404(
        DomainJoinRequest.objects.select_for_update(),
        pk=self.kwargs["req_id"],
        domain=domain,
    )
    if join_request.status != DomainJoinRequest.STATUS_PENDING:
        return Response(
            {"detail": "not_pending"},
            status=status.HTTP_409_CONFLICT,
        )
    with transaction.atomic():
        join_request.status = DomainJoinRequest.STATUS_APPROVED
        join_request.decided_by = request.user
        join_request.decided_at = timezone.now()
        join_request.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
        domain.members.add(join_request.user)
        transaction.on_commit(
            lambda: send_join_request_approved_email(join_request=join_request)
        )
    return Response(DomainJoinRequestReadSerializer(join_request).data)


@action(detail=True, methods=["post"], url_path="reject")
def reject(self, request, *args, **kwargs):
    domain = self._get_domain()
    self._check_can_approve(domain)
    join_request = drf_get_object_or_404(
        DomainJoinRequest.objects.select_for_update(),
        pk=self.kwargs["req_id"],
        domain=domain,
    )
    if join_request.status != DomainJoinRequest.STATUS_PENDING:
        return Response(
            {"detail": "not_pending"},
            status=status.HTTP_409_CONFLICT,
        )
    serializer = DomainJoinRequestRejectSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    reason = serializer.validated_data.get("reason", "")
    with transaction.atomic():
        join_request.status = DomainJoinRequest.STATUS_REJECTED
        join_request.decided_by = request.user
        join_request.decided_at = timezone.now()
        join_request.reject_reason = reason
        join_request.save(update_fields=["status", "decided_by", "decided_at", "reject_reason", "updated_at"])
        transaction.on_commit(
            lambda: send_join_request_rejected_email(join_request=join_request)
        )
    return Response(DomainJoinRequestReadSerializer(join_request).data)
```

The `select_for_update` requires the operation to run inside `transaction.atomic()` — wrap the lookup in `with transaction.atomic():` if your DB requires it. SQLite ignores `select_for_update` so the existing tests pass without it; production Postgres needs the wrapping.

- [ ] **Step 8.5: Wire the action URLs**

In `quizonline-server/domain/api_urls.py`, add the new bindings:

```python
join_request_approve = DomainJoinRequestViewSet.as_view({"post": "approve"})
join_request_reject = DomainJoinRequestViewSet.as_view({"post": "reject"})

urlpatterns = router.urls + [
    # (... existing path() entries ...)
    path(
        "<int:domain_id>/join-request/<int:req_id>/approve/",
        join_request_approve,
        name="domain-join-request-approve",
    ),
    path(
        "<int:domain_id>/join-request/<int:req_id>/reject/",
        join_request_reject,
        name="domain-join-request-reject",
    ),
]
```

- [ ] **Step 8.6: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestApproveRejectTests -v 2
```

Expected: `OK` (6 tests).

- [ ] **Step 8.7: Commit**

```bash
git add quizonline-server/domain/views.py quizonline-server/domain/api_urls.py quizonline-server/domain/serializers.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): approve/reject actions on join requests with notifications"
```

---

## Task 9: Implement `cancel` action

**Files:**
- Modify: `quizonline-server/domain/views.py`
- Modify: `quizonline-server/domain/api_urls.py`
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 9.1: Add failing tests**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
class JoinRequestCancelTests(TestCase):
    URL = "/api/domain/{}/join-request/{}/cancel/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd")
        self.joiner = User.objects.create_user(username="jo", password="pwd")
        self.other = User.objects.create_user(username="ot", password="pwd")
        self.superuser = User.objects.create_user(username="root", password="pwd", is_superuser=True, is_staff=True)
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.req = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)
        self.client = APIClient()

    def test_requester_can_cancel(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "cancelled")

    def test_non_requester_cannot_cancel(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.post(self.URL.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_cancel_someone_elses_request(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_can_cancel(self):
        self.client.force_authenticate(user=self.superuser)
        res = self.client.post(self.URL.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cannot_cancel_non_pending(self):
        self.req.status = DomainJoinRequest.STATUS_APPROVED
        self.req.save(update_fields=["status"])
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain.id, self.req.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
```

- [ ] **Step 9.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestCancelTests -v 2
```

Expected: 404 on each test.

- [ ] **Step 9.3: Implement the action**

In `quizonline-server/domain/views.py`, inside `DomainJoinRequestViewSet`:

```python
@action(detail=True, methods=["post"], url_path="cancel")
def cancel(self, request, *args, **kwargs):
    domain = self._get_domain()
    join_request = drf_get_object_or_404(
        DomainJoinRequest.objects.all(),
        pk=self.kwargs["req_id"],
        domain=domain,
    )
    is_superuser = bool(getattr(request.user, "is_superuser", False))
    if join_request.user_id != request.user.id and not is_superuser:
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        raise DRFPermissionDenied("Only the requester can cancel their own join request.")
    if join_request.status != DomainJoinRequest.STATUS_PENDING:
        return Response(
            {"detail": "not_pending"},
            status=status.HTTP_409_CONFLICT,
        )
    join_request.status = DomainJoinRequest.STATUS_CANCELLED
    join_request.save(update_fields=["status", "updated_at"])
    return Response(DomainJoinRequestReadSerializer(join_request).data)
```

- [ ] **Step 9.4: Wire the URL**

In `quizonline-server/domain/api_urls.py`:

```python
join_request_cancel = DomainJoinRequestViewSet.as_view({"post": "cancel"})

urlpatterns = router.urls + [
    # (... existing path() entries ...)
    path(
        "<int:domain_id>/join-request/<int:req_id>/cancel/",
        join_request_cancel,
        name="domain-join-request-cancel",
    ),
]
```

- [ ] **Step 9.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.JoinRequestCancelTests -v 2
```

Expected: `OK` (5 tests).

- [ ] **Step 9.6: Commit**

```bash
git add quizonline-server/domain/views.py quizonline-server/domain/api_urls.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): cancel action on join requests (requester only)"
```

---

## Task 10: Implement `GET /api/user/me/join-requests/`

**Files:**
- Modify: `quizonline-server/customuser/views.py`
- Test: `quizonline-server/customuser/tests/test_views.py`

- [ ] **Step 10.1: Add failing test**

Append to `quizonline-server/customuser/tests/test_views.py`, inside `UserViewsTests`:

```python
def test_me_join_requests_returns_only_my_pending_requests(self):
    from domain.models import DomainJoinRequest, JoinPolicy
    other_user = User.objects.create_user(username="other", password="o", email="o@e.test")
    domain1 = Domain.objects.create(owner=self.staff, active=True)
    domain1.set_current_language("fr")
    domain1.name = "V1"
    domain1.join_policy = JoinPolicy.OWNER
    domain1.save()
    domain2 = Domain.objects.create(owner=self.staff, active=True)
    domain2.set_current_language("fr")
    domain2.name = "V2"
    domain2.join_policy = JoinPolicy.OWNER
    domain2.save()

    DomainJoinRequest.objects.create(domain=domain1, user=self.u1)  # pending, mine
    rejected = DomainJoinRequest.objects.create(domain=domain2, user=self.u1)  # rejected, mine
    rejected.status = DomainJoinRequest.STATUS_REJECTED
    rejected.save(update_fields=["status"])
    DomainJoinRequest.objects.create(domain=domain1, user=other_user)  # not mine

    self.client.force_authenticate(user=self.u1)
    res = self.client.get("/api/user/me/join-requests/")
    self.assertEqual(res.status_code, status.HTTP_200_OK)
    statuses = [r["status"] for r in res.data]
    domain_ids = [r["domain"] for r in res.data]
    self.assertEqual(len(res.data), 1)
    self.assertEqual(statuses, ["pending"])
    self.assertEqual(domain_ids, [domain1.id])
```

- [ ] **Step 10.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_views.UserViewsTests.test_me_join_requests_returns_only_my_pending_requests -v 2
```

Expected: 404 (URL not wired).

- [ ] **Step 10.3: Add the action on `CustomUserViewSet`**

In `quizonline-server/customuser/views.py`, inside `CustomUserViewSet`:

```python
@action(detail=False, methods=["get"], url_path="me/join-requests")
def me_join_requests(self, request):
    from domain.models import DomainJoinRequest
    from domain.serializers import DomainJoinRequestReadSerializer
    qs = (
        DomainJoinRequest.objects
        .filter(user=request.user, status=DomainJoinRequest.STATUS_PENDING)
        .select_related("domain")
        .order_by("-created_at")
    )
    return Response(DomainJoinRequestReadSerializer(qs, many=True).data)
```

The action's URL is automatically `/api/user/me/join-requests/` via the existing router registration of `CustomUserViewSet`.

- [ ] **Step 10.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_views.UserViewsTests.test_me_join_requests_returns_only_my_pending_requests -v 2
```

Expected: `OK`.

- [ ] **Step 10.5: Commit**

```bash
git add quizonline-server/customuser/views.py quizonline-server/customuser/tests/test_views.py
git commit -m "feat(user): GET /api/user/me/join-requests/ lists my pending requests"
```

---

## Task 11: Add helper + use it in `CustomUserCreateSerializer.create`

**Files:**
- Create: `quizonline-server/customuser/services.py` (if it does not exist)
- Modify: `quizonline-server/customuser/serializers.py`
- Test: `quizonline-server/customuser/tests/test_serializers.py`

- [ ] **Step 11.1: Add failing serializer test**

Append to `quizonline-server/customuser/tests/test_serializers.py`:

```python
def test_create_with_mixed_auto_and_validation_domains(self):
    from domain.models import Domain, DomainJoinRequest, JoinPolicy
    from django.utils import translation
    translation.activate("fr")
    owner = User.objects.create_user(username="o", password="pwd")
    auto_domain = Domain.objects.create(owner=owner, active=True)
    auto_domain.set_current_language("fr")
    auto_domain.name = "auto"
    auto_domain.save()
    val_domain = Domain.objects.create(owner=owner, active=True)
    val_domain.set_current_language("fr")
    val_domain.name = "val"
    val_domain.join_policy = JoinPolicy.OWNER
    val_domain.save()

    s = CustomUserCreateSerializer(
        data={
            "username": "newbie",
            "email": "newbie@e.test",
            "first_name": "N",
            "last_name": "B",
            "password": "S3cretPass!",
            "managed_domain_ids": [auto_domain.id, val_domain.id],
        }
    )
    self.assertTrue(s.is_valid(), s.errors)
    user = s.save()

    # auto domain → linked instantly
    self.assertTrue(user.linked_domains.filter(pk=auto_domain.id).exists())
    # validation domain → NOT linked, but a pending request exists
    self.assertFalse(user.linked_domains.filter(pk=val_domain.id).exists())
    self.assertTrue(
        DomainJoinRequest.objects.filter(
            domain=val_domain, user=user, status="pending"
        ).exists()
    )
```

- [ ] **Step 11.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: `AssertionError` (the validation domain is currently linked instantly).

- [ ] **Step 11.3: Create the helper in `customuser/services.py`**

If the file does not exist, create it. Otherwise, append:

```python
from __future__ import annotations

from django.db import transaction

from domain.models import Domain, DomainJoinRequest, JoinPolicy
from domain.services import users_who_can_approve


def reconcile_user_domain_membership(user, target_domain_ids):
    """
    Apply a target list of domain IDs to a user's `linked_domains`.

    - Domains that disappear from the list are removed unconditionally
      (self-leave is always allowed).
    - Domains that appear in the list and have `join_policy == auto` are
      added directly.
    - Domains that appear in the list and have a validation policy create
      a `pending` `DomainJoinRequest` (idempotent — `get_or_create`).

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
```

- [ ] **Step 11.4: Wire the helper into `CustomUserCreateSerializer.create`**

In `quizonline-server/customuser/serializers.py`, locate `CustomUserCreateSerializer.create` and replace the `if managed_domain_ids:` block:

```python
# OLD:
# if managed_domain_ids:
#     user.linked_domains.set(Domain.objects.filter(id__in=managed_domain_ids, active=True))
#     user.ensure_current_domain_is_valid(auto_fix=True)

# NEW:
if managed_domain_ids:
    from customuser.services import reconcile_user_domain_membership
    reconcile_user_domain_membership(user, managed_domain_ids)
    user.ensure_current_domain_is_valid(auto_fix=True)
```

- [ ] **Step 11.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: `OK` for the new test (and all existing tests still passing).

- [ ] **Step 11.6: Commit**

```bash
git add quizonline-server/customuser/services.py quizonline-server/customuser/serializers.py quizonline-server/customuser/tests/test_serializers.py
git commit -m "feat(user): split auto vs validation domains in user registration"
```

---

## Task 12: Use the helper in `CustomUserProfileUpdateSerializer.update`

**Files:**
- Modify: `quizonline-server/customuser/serializers.py`
- Test: `quizonline-server/customuser/tests/test_serializers.py`

- [ ] **Step 12.1: Add failing test**

Append to `quizonline-server/customuser/tests/test_serializers.py`:

```python
def test_profile_update_with_validation_domain_creates_pending_not_link(self):
    from domain.models import Domain, DomainJoinRequest, JoinPolicy
    from django.utils import translation
    translation.activate("fr")
    user = User.objects.create_user(username="u", password="pwd")
    owner = User.objects.create_user(username="o", password="pwd")
    val_domain = Domain.objects.create(owner=owner, active=True)
    val_domain.set_current_language("fr")
    val_domain.name = "val"
    val_domain.join_policy = JoinPolicy.OWNER
    val_domain.save()

    s = CustomUserProfileUpdateSerializer(
        instance=user,
        data={"managed_domain_ids": [val_domain.id]},
        partial=True,
    )
    self.assertTrue(s.is_valid(), s.errors)
    s.save()

    self.assertFalse(user.linked_domains.filter(pk=val_domain.id).exists())
    self.assertTrue(
        DomainJoinRequest.objects.filter(domain=val_domain, user=user, status="pending").exists()
    )

def test_profile_update_dropping_domain_id_removes_membership(self):
    from domain.models import Domain
    from django.utils import translation
    translation.activate("fr")
    user = User.objects.create_user(username="u2", password="pwd")
    owner = User.objects.create_user(username="o2", password="pwd")
    auto_domain = Domain.objects.create(owner=owner, active=True)
    auto_domain.set_current_language("fr")
    auto_domain.name = "auto"
    auto_domain.save()
    user.linked_domains.add(auto_domain)

    s = CustomUserProfileUpdateSerializer(
        instance=user,
        data={"managed_domain_ids": []},
        partial=True,
    )
    self.assertTrue(s.is_valid(), s.errors)
    s.save()

    self.assertFalse(user.linked_domains.filter(pk=auto_domain.id).exists())
```

- [ ] **Step 12.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: failure on the first new test.

- [ ] **Step 12.3: Modify `CustomUserProfileUpdateSerializer.update`**

In `quizonline-server/customuser/serializers.py`, locate the `update` method and replace the `if managed_domain_ids is not None:` block:

```python
# OLD:
# if managed_domain_ids is not None:
#     instance.linked_domains.set(Domain.objects.filter(id__in=managed_domain_ids, active=True))

# NEW:
if managed_domain_ids is not None:
    from customuser.services import reconcile_user_domain_membership
    reconcile_user_domain_membership(instance, managed_domain_ids)
```

- [ ] **Step 12.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: `OK`.

- [ ] **Step 12.5: Commit**

```bash
git add quizonline-server/customuser/serializers.py quizonline-server/customuser/tests/test_serializers.py
git commit -m "feat(user): split auto vs validation domains on profile update"
```

---

## Task 13: Expose `pending_join_requests` on `CustomUserReadSerializer`

**Files:**
- Modify: `quizonline-server/customuser/serializers.py`
- Test: `quizonline-server/customuser/tests/test_serializers.py`

- [ ] **Step 13.1: Add failing test**

Append to `quizonline-server/customuser/tests/test_serializers.py`:

```python
def test_read_serializer_exposes_pending_join_requests(self):
    from domain.models import Domain, DomainJoinRequest, JoinPolicy
    from django.utils import translation
    translation.activate("fr")
    user = User.objects.create_user(username="u3", password="pwd")
    owner = User.objects.create_user(username="o3", password="pwd")
    val_domain = Domain.objects.create(owner=owner, active=True)
    val_domain.set_current_language("fr")
    val_domain.name = "val"
    val_domain.join_policy = JoinPolicy.OWNER
    val_domain.save()
    DomainJoinRequest.objects.create(domain=val_domain, user=user)

    data = CustomUserReadSerializer(user).data
    self.assertIn("pending_join_requests", data)
    self.assertEqual(len(data["pending_join_requests"]), 1)
    self.assertEqual(data["pending_join_requests"][0]["domain_id"], val_domain.id)
```

- [ ] **Step 13.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: `KeyError: 'pending_join_requests'`.

- [ ] **Step 13.3: Add the field on `CustomUserReadSerializer`**

In `quizonline-server/customuser/serializers.py`, locate `CustomUserReadSerializer`. Add a `SerializerMethodField` and include it in `Meta.fields`:

```python
class CustomUserReadSerializer(...):
    # ... existing fields ...
    pending_join_requests = serializers.SerializerMethodField()

    class Meta:
        # ... existing fields tuple ...
        fields = (
            # ... existing entries ...
            "pending_join_requests",
        )

    def get_pending_join_requests(self, obj) -> list[dict]:
        from domain.models import DomainJoinRequest
        qs = DomainJoinRequest.objects.filter(
            user=obj, status=DomainJoinRequest.STATUS_PENDING
        ).order_by("-created_at").values("id", "domain_id", "created_at")
        return [
            {"id": r["id"], "domain_id": r["domain_id"], "created_at": r["created_at"]}
            for r in qs
        ]
```

- [ ] **Step 13.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser.tests.test_serializers -v 2
```

Expected: `OK`.

- [ ] **Step 13.5: Commit**

```bash
git add quizonline-server/customuser/serializers.py quizonline-server/customuser/tests/test_serializers.py
git commit -m "feat(user): expose pending_join_requests on CustomUserReadSerializer"
```

---

## Task 14: Modify `member_role` to flip pending → approved on admin push

**Files:**
- Modify: `quizonline-server/domain/views.py`
- Modify: `quizonline-server/domain/services.py`
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 14.1: Add failing test**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
class MemberRolePromotesPendingRequestTests(TestCase):
    URL = "/api/domain/{}/member-role/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd")
        self.joiner = User.objects.create_user(username="jo", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        # The user must already be a member to be eligible for is_domain_manager
        # in the existing member_role flow — but our case is a brand-new join.
        # Use the dedicated `add_member` path: instead of going via member_role
        # with is_domain_manager, we simulate the equivalent: owner adds the
        # user to members directly, and we expect the pending request to flip.
        self.req = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)
        self.client = APIClient()

    def test_admin_push_via_is_domain_manager_flips_pending_to_approved(self):
        # First link the user as a member (precondition for is_domain_manager).
        self.domain.members.add(self.joiner)
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            self.URL.format(self.domain.id),
            {"user_id": self.joiner.id, "is_domain_manager": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "approved")
        self.assertEqual(self.req.decided_by_id, self.owner.id)
        self.assertIsNotNone(self.req.decided_at)
```

Note: the existing `member_role` flow only operates on users that are already linked to the domain (`if not domain.members.filter(...).exists() and domain.owner_id != target.pk: ValidationError`). So for the integration to be testable we add the user as a member first. The flip should still happen on the same call.

- [ ] **Step 14.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.MemberRolePromotesPendingRequestTests -v 2
```

Expected: failure (`status` still `pending`).

- [ ] **Step 14.3: Add the helper in `domain/services.py`**

In `quizonline-server/domain/services.py`, append:

```python
from django.utils import timezone


def flip_pending_to_approved(domain, user, *, by) -> int:
    """
    If `user` has a pending DomainJoinRequest for `domain`, mark it as
    approved and return 1; otherwise return 0. Used on the admin-push race.
    """
    return (
        DomainJoinRequest.objects
        .filter(domain=domain, user=user, status=DomainJoinRequest.STATUS_PENDING)
        .update(
            status=DomainJoinRequest.STATUS_APPROVED,
            decided_by=by,
            decided_at=timezone.now(),
        )
    )
```

- [ ] **Step 14.4: Call the helper from `member_role`**

In `quizonline-server/domain/views.py`, inside `DomainViewSet.member_role`, after the `is_domain_manager: true` branch (the part that runs `domain.managers.add(target)` and `domain.members.add(target)`), add:

```python
if make_manager:
    domain.managers.add(target)
    domain.members.add(target)
    if is_superuser and not target.is_staff:
        target.is_staff = True
        update_fields.append("is_staff")
    # NEW: any pending join request gets flipped to approved.
    from domain.services import flip_pending_to_approved
    flip_pending_to_approved(domain, target, by=requester)
```

- [ ] **Step 14.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.MemberRolePromotesPendingRequestTests -v 2
```

Expected: `OK`.

Also re-run the prior member_role hardening tests to ensure no regression:
```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_views.DomainMemberRoleHardeningTests -v 2
```

Expected: still `OK`.

- [ ] **Step 14.6: Commit**

```bash
git add quizonline-server/domain/views.py quizonline-server/domain/services.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): flip pending join request to approved on admin push"
```

---

## Task 15: Auto-approve pending requests when `join_policy` transitions to `auto`

**Files:**
- Modify: `quizonline-server/domain/serializers.py`
- Modify: `quizonline-server/domain/services.py`
- Test: `quizonline-server/domain/tests/test_join_request_views.py`

- [ ] **Step 15.1: Add failing test**

Append to `quizonline-server/domain/tests/test_join_request_views.py`:

```python
class PolicyTransitionAutoApprovesPendingTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd")
        self.joiner1 = User.objects.create_user(username="j1", password="pwd", email="j1@e.test")
        self.joiner2 = User.objects.create_user(username="j2", password="pwd", email="j2@e.test")
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.req1 = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner1)
        self.req2 = DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner2)
        self.client = APIClient()

    def test_switch_to_auto_approves_all_pending_and_emails(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            f"/api/domain/{self.domain.id}/",
            {"join_policy": "auto"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.req1.refresh_from_db()
        self.req2.refresh_from_db()
        self.assertEqual(self.req1.status, "approved")
        self.assertEqual(self.req2.status, "approved")
        self.assertEqual(self.req1.decided_by_id, self.owner.id)
        self.assertTrue(self.domain.members.filter(pk=self.joiner1.pk).exists())
        self.assertTrue(self.domain.members.filter(pk=self.joiner2.pk).exists())
        # Two notification emails should be enqueued (one per former pending).
        self.assertGreaterEqual(
            OutboundEmail.objects.filter(recipients__contains=[self.joiner1.email]).count(), 1
        )
        self.assertGreaterEqual(
            OutboundEmail.objects.filter(recipients__contains=[self.joiner2.email]).count(), 1
        )
```

- [ ] **Step 15.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.PolicyTransitionAutoApprovesPendingTests -v 2
```

Expected: pending requests still pending after the PATCH.

- [ ] **Step 15.3: Add the bulk helper in `domain/services.py`**

In `quizonline-server/domain/services.py`, append:

```python
def auto_approve_pending_requests(domain, *, by) -> list[DomainJoinRequest]:
    """
    Mark all pending requests on `domain` as approved (e.g., when the
    join_policy is downgraded to `auto`). Adds each requester to
    `domain.members` and returns the list of approved requests so the
    caller can dispatch notification emails.
    """
    pending = list(
        DomainJoinRequest.objects
        .filter(domain=domain, status=DomainJoinRequest.STATUS_PENDING)
        .select_related("user")
    )
    if not pending:
        return []
    now = timezone.now()
    ids = [r.id for r in pending]
    DomainJoinRequest.objects.filter(id__in=ids).update(
        status=DomainJoinRequest.STATUS_APPROVED,
        decided_by=by,
        decided_at=now,
    )
    domain.members.add(*[r.user_id for r in pending])
    # Re-fetch with the new state so callers see the right status when iterating.
    return list(
        DomainJoinRequest.objects.filter(id__in=ids).select_related("user", "domain")
    )
```

- [ ] **Step 15.4: Hook the transition in `DomainWriteSerializer.update`**

In `quizonline-server/domain/serializers.py`, locate `DomainWriteSerializer.update` (or override `update` if it does not exist). Add the post-save hook:

```python
def update(self, instance, validated_data):
    previous_policy = instance.join_policy
    instance = super().update(instance, validated_data)
    new_policy = instance.join_policy

    if previous_policy != "auto" and new_policy == "auto":
        from django.db import transaction
        from domain.services import auto_approve_pending_requests
        from core.mailers.domain_join import send_join_request_approved_email
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        approved = auto_approve_pending_requests(instance, by=actor)
        for jr in approved:
            transaction.on_commit(
                lambda jr=jr: send_join_request_approved_email(join_request=jr)
            )
    return instance
```

If `DomainWriteSerializer` has no explicit `update` method today, add one that delegates to `super().update(...)` with the hook above.

- [ ] **Step 15.5: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.test_join_request_views.PolicyTransitionAutoApprovesPendingTests -v 2
```

Expected: `OK`.

- [ ] **Step 15.6: Commit**

```bash
git add quizonline-server/domain/serializers.py quizonline-server/domain/services.py quizonline-server/domain/tests/test_join_request_views.py
git commit -m "feat(domain): auto-approve pending requests when join_policy is downgraded to auto"
```

---

## Task 16: Add `pending_join_requests_count` and `my_join_request_status` to `DomainReadSerializer`

**Files:**
- Modify: `quizonline-server/domain/serializers.py`
- Test: `quizonline-server/domain/tests/tests_serializers.py`

- [ ] **Step 16.1: Add failing test**

Append to `quizonline-server/domain/tests/tests_serializers.py`:

```python
class DomainReadSerializerComputedFieldsTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd")
        self.stranger = User.objects.create_user(username="st", password="pwd")
        self.joiner = User.objects.create_user(username="jo", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="V", description="", active=True)
        from domain.models import JoinPolicy
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])

        from domain.models import DomainJoinRequest
        DomainJoinRequest.objects.create(domain=self.domain, user=self.joiner)

        self.factory = APIRequestFactory()

    def _ctx(self, user):
        request = self.factory.get(f"/api/domain/{self.domain.id}/")
        request.user = user
        return {"request": request}

    def test_pending_count_visible_to_owner(self):
        data = DomainReadSerializer(self.domain, context=self._ctx(self.owner)).data
        self.assertEqual(data["pending_join_requests_count"], 1)

    def test_pending_count_null_for_stranger(self):
        data = DomainReadSerializer(self.domain, context=self._ctx(self.stranger)).data
        self.assertIsNone(data["pending_join_requests_count"])

    def test_my_join_request_status_pending_for_joiner(self):
        data = DomainReadSerializer(self.domain, context=self._ctx(self.joiner)).data
        self.assertEqual(data["my_join_request_status"], "pending")

    def test_my_join_request_status_null_for_stranger(self):
        data = DomainReadSerializer(self.domain, context=self._ctx(self.stranger)).data
        self.assertIsNone(data["my_join_request_status"])
```

- [ ] **Step 16.2: Run, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainReadSerializerComputedFieldsTests -v 2
```

Expected: `KeyError`.

- [ ] **Step 16.3: Implement the two computed fields on `DomainReadSerializer`**

In `quizonline-server/domain/serializers.py`, inside `DomainReadSerializer`:

```python
from domain.models import DomainJoinRequest
from domain.permissions import CanApproveJoinRequest


class DomainReadSerializer(...):
    # ... existing fields ...
    pending_join_requests_count = serializers.SerializerMethodField()
    my_join_request_status = serializers.SerializerMethodField()

    class Meta:
        # ... existing tuple ...
        fields = (
            # ... existing entries ...
            "join_policy",
            "pending_join_requests_count",
            "my_join_request_status",
        )

    def get_pending_join_requests_count(self, obj) -> int | None:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        perm = CanApproveJoinRequest()
        if not perm.has_object_permission(request, None, obj):
            return None
        return DomainJoinRequest.objects.filter(
            domain=obj, status=DomainJoinRequest.STATUS_PENDING
        ).count()

    def get_my_join_request_status(self, obj) -> str | None:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        latest = (
            DomainJoinRequest.objects
            .filter(domain=obj, user=user)
            .order_by("-created_at")
            .values_list("status", flat=True)
            .first()
        )
        return latest
```

- [ ] **Step 16.4: Run, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test domain.tests.tests_serializers.DomainReadSerializerComputedFieldsTests -v 2
```

Expected: `OK`.

- [ ] **Step 16.5: Run the full test suite to catch regressions**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test
```

Expected: `OK` (full suite green).

- [ ] **Step 16.6: Commit**

```bash
git add quizonline-server/domain/serializers.py quizonline-server/domain/tests/tests_serializers.py
git commit -m "feat(domain): expose pending count + my join status on DomainReadSerializer"
```

---

## Task 17: Regenerate OpenAPI schema and the Angular client

**Files:**
- Modify: `quizonline-server/openapi.yaml`
- Modify: `quizonline-frontend/openapi.yaml`
- Modify: generated files under `quizonline-frontend/src/app/api/generated/`

- [ ] **Step 17.1: Run the schema sync script**

```bash
cd D:/PycharmProjects/QuizOnline && powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-openapi.ps1
```

Expected: the script regenerates `quizonline-server/openapi.yaml`, copies it to `quizonline-frontend/openapi.yaml`, and runs the OpenAPI generator over it. New TS interfaces appear under `quizonline-frontend/src/app/api/generated/model/` for `DomainJoinRequest`, `DomainMemberRoleRequest`, etc., and the existing `Domain` model picks up the new fields.

If the script fails because of an unrelated missing dependency, run the two steps manually:

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py spectacular --file openapi.yaml
cp quizonline-server/openapi.yaml quizonline-frontend/openapi.yaml
cd quizonline-frontend && npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g typescript-angular -o src/app/api/generated --additional-properties=fileNaming=kebab-case,withInterfaces=true
```

- [ ] **Step 17.2: Sanity-check the diff**

```bash
cd D:/PycharmProjects/QuizOnline && git status quizonline-server/openapi.yaml quizonline-frontend/
```

You should see modified `openapi.yaml` files and several modified / new files under `quizonline-frontend/src/app/api/generated/`.

- [ ] **Step 17.3: Commit the regenerated artifacts**

```bash
git add quizonline-server/openapi.yaml quizonline-frontend/openapi.yaml quizonline-frontend/src/app/api/generated/
git commit -m "chore: regenerate OpenAPI schema and Angular client for join request endpoints"
```

---

## Final verification

After Task 17, run the full backend suite one more time to confirm nothing has drifted:

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test
```

Expected output: `Ran NNN tests`, all green.

If you changed any test fixture in `customuser/tests/test_views.py` (Task 10), also re-run:

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test customuser
```

The frontend Playwright e2e tests under `quizonline-frontend/e2e/fullstack/` are unaffected by this feature (no UI work), but if you want to confirm nothing there is broken by the regenerated client, run them once:

```bash
cd quizonline-frontend && npx playwright test --config=playwright.fullstack.config.ts
```

---

## Self-review notes (resolved)

| Concern | Resolution |
|---|---|
| Spec coverage | Tasks 1-16 collectively implement every behaviour listed in the spec's "Decisions taken during brainstorming" table. Task 17 covers the OpenAPI/client regeneration. |
| Mailer style | The spec mentioned `core/templates/mailers/`. I switched to the `core/mailers/registration.py` dict-per-language pattern after confirming there is no template directory in this codebase — the convention is in-Python copy. The spec is updated implicitly by this plan; if you prefer Django templates, swap Task 6 step 6.3 for a `Template` + `render_to_string` version. |
| `member_role` race | Task 14 only reacts on the `is_domain_manager: true` branch (the existing add path). If a future "add_member" intent is added to `member_role`, repeat the `flip_pending_to_approved` call there. |
| Frontend work | Out of scope of this plan. The OpenAPI regen in Task 17 unblocks frontend work; UI updates (badge, "Request to join" button, pending list page) belong in a separate frontend ticket. |
