# Domain Join Policy — Design Spec

**Status:** Draft, awaiting review
**Author:** brainstorming session 2026-04-11
**Scope:** Backend (Django) + minor frontend touch-points (Angular catalog updates)

## Goal

Allow each `Domain` to declare how new members are admitted, with three modes:

- **Automatic** — current behaviour, anyone authenticated can self-link instantly.
- **Owner validation** — self-link creates a pending request that only the domain owner can approve/reject.
- **Owner or managers validation** — same, but any manager (or the owner) can approve/reject.

The feature must integrate cleanly with the existing data model, the `OutboundEmail` outbox, the multilingual conventions, and the recently hardened `member_role` flow.

## Non-goals (v1)

- Hard ban / blocklist of users on a domain.
- Cooldown after a rejection (re-request is allowed immediately).
- Auto-expiration / purge of stale pending requests.
- Auto-translation of the rejection reason via DeepL.
- Templated / pre-filled rejection reasons.
- Gating self-removal from a domain (leaving stays free, like leaving a Slack channel).
- Renaming the legacy `managed_domain_ids` field on the user serializers (it's misnamed but out of scope).

## Decisions taken during brainstorming

| # | Decision |
|---|---|
| 1 | Persistent `DomainJoinRequest` table, not ephemeral token-based requests. |
| 2 | Gate the self-service flows only (registration + `PATCH /api/user/me/`). Admin push via `member_role` stays instant — it counts as implicit approval. |
| 3 | Default `join_policy = "auto"` for both existing rows (migration) and new domains (model default). Backward-compatible. |
| 4 | Lifecycle states: `pending`, `approved`, `rejected`, `cancelled`. **No** `superseded` state — admin push that races with a pending request flips it to `approved` with `decided_by = the_pushing_manager`. |
| 5 | No cooldown, no hard ban: a rejected user can create a new request immediately. |
| 6 | Optional `reject_reason` text field (max 500 chars). |
| 7 | Notifications via the existing `OutboundEmail` outbox: email on create / approve / reject. No email on cancel or implicit-approval-via-admin-push. |
| 8 | In-app counter exposed on the domain serializer (for managers/owners only). |
| 9 | Self-removal stays unchanged (free, no validation). |
| 10 | Only the domain **owner** (and superuser) can change `join_policy`. Managers cannot. |
| 11 | Lowering `join_policy` to `auto` auto-approves all currently-pending requests. |
| 12 | All status enums are English machine codes; localization is handled by the Angular i18n catalog. Emails are rendered in the recipient's language via the existing `translation.override` pattern. |
| 13 | The `reject_reason` field is plain free text in the manager's language. No language tracking, no auto-translation. The UI hints the manager about the requester's language. |

## Data model

### Modification to `Domain` (`quizonline-server/domain/models.py`)

Add a single field with a Django `TextChoices` enum and a default that preserves backwards compatibility.

```python
from django.utils.translation import gettext_lazy as _

class JoinPolicy(models.TextChoices):
    AUTO = "auto", _("Automatic")
    OWNER = "owner", _("Owner validation")
    OWNER_MANAGERS = "owner_managers", _("Owner or managers validation")

class Domain(AuditMixin, TranslatableModel):
    # ... existing fields ...
    join_policy = models.CharField(
        max_length=20,
        choices=JoinPolicy.choices,
        default=JoinPolicy.AUTO,
    )
```

A migration adds the column with `default="auto"`. No data migration needed.

### New model `DomainJoinRequest` (`quizonline-server/domain/models.py`)

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

The partial unique constraint enforces "at most one pending per (domain, user)" — exactly what idempotent create needs.

`decided_by` is nullable because a self-cancel by the requester does not need to be recorded as a decision.

`reject_reason` is plain free text, written in the manager's language. No language tracking; the rejection-email template includes a hint.

## API surface

All new endpoints sit under the existing `/api/domain/` namespace, with one `/api/user/me/` route for the user's personal view.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/domain/{domain_id}/join-request/` | User creates (or fetches existing pending) join request. Idempotent. |
| `GET` | `/api/domain/{domain_id}/join-request/` | List join requests for the domain (managers/owner only). Returns all statuses by default, ordered by `-created_at`. Supports `?status=pending` query filter. |
| `GET` | `/api/domain/{domain_id}/join-request/{req_id}/` | Retrieve a single request. |
| `POST` | `/api/domain/{domain_id}/join-request/{req_id}/approve/` | Approve. |
| `POST` | `/api/domain/{domain_id}/join-request/{req_id}/reject/` | Reject. Body: `{"reason": "..."}` (optional). |
| `POST` | `/api/domain/{domain_id}/join-request/{req_id}/cancel/` | Requester cancels their own pending request. |
| `GET` | `/api/user/me/join-requests/` | The authenticated user's pending requests across all domains. |

### `POST /api/domain/{domain_id}/join-request/` — behaviour matrix

| Precondition | Response |
|---|---|
| Domain inactive (or not visible to this user) | `404` (no leak of existence) |
| Requester is the domain owner | `400 {"detail": "already_owner"}` |
| Requester is already a member | `409 {"detail": "already_member"}` |
| `join_policy == "auto"` | Add user to `domain.members` directly, return `200` with `{"status": "approved", "request": null}`. **No** `DomainJoinRequest` row is created — the table stays clean. |
| `join_policy in ("owner", "owner_managers")` and a `pending` request already exists | `200 {"status": "pending", "request": {...}}` (idempotent, returns existing) |
| `join_policy in ("owner", "owner_managers")` and no pending request exists | Create new `pending` request, send notification emails, return `201 {"status": "pending", "request": {...}}` |

### Permission rules

| Action | Authorized actors |
|---|---|
| Create a join request | Authenticated user; not the owner; not already a member; domain `active=True` |
| List / retrieve requests of a domain | Owner of the domain (always), managers of the domain (if `join_policy == "owner_managers"`), superuser |
| Approve / reject | Same as list |
| Cancel | The requester themselves, or a superuser |
| Read `/api/user/me/join-requests/` | The authenticated user (themselves only) |
| Modify `Domain.join_policy` | Owner of the domain, or superuser. **Not** managers. |

### Modifications to existing endpoints

#### `CustomUserCreateSerializer.create` and `CustomUserProfileUpdateSerializer.update`

Today both serializers do `user.linked_domains.set(managed_domain_ids)` brutally — both add and remove. We keep the remove side (a user can leave a domain by dropping it from the list), but split the add side by policy:

```text
existing_ids   = current set(user.linked_domains.ids)
target_ids     = set(payload managed_domain_ids)
to_remove      = existing_ids - target_ids   # always allowed
to_add         = target_ids - existing_ids
to_add_auto    = [d for d in to_add if d.join_policy == "auto"]
to_add_pending = [d for d in to_add if d.join_policy != "auto"]

linked_domains.remove(*to_remove)
linked_domains.add(*to_add_auto)
for d in to_add_pending:
    DomainJoinRequest.objects.get_or_create(
        domain=d, user=user, status="pending",
        defaults={...},
    )
```

The response payload (existing `CustomUserReadSerializer`) gains a new field `pending_join_requests` exposing the user's currently-pending requests in compact form (`[{"domain_id": …, "id": …, "created_at": …}, …]`) so the frontend can render the "request pending on Y" UI without an extra round-trip.

#### `DomainViewSet.member_role`

When an admin push (`is_domain_manager: true`) lands on a user who has a `pending` join request for the same domain, the request is flipped to `approved` in the same transaction:

```python
DomainJoinRequest.objects.filter(
    domain=domain, user=target, status="pending",
).update(
    status="approved",
    decided_by=request.user,
    decided_at=timezone.now(),
)
```

No email is sent in this path (the admin push is treated as an in-band approval; the user becomes a member and the existing UI surfaces that).

#### `DomainViewSet.update` / `DomainWriteSerializer.update`

When `join_policy` transitions to `"auto"` (from any other value), all currently-pending requests on this domain are auto-approved in the same transaction, with `decided_by = request.user`. An "approved" email is sent to each affected requester (using the same mailer as a normal approval). The transition is logged.

Other transitions (`auto` → validation, `owner_managers` → `owner`) require no cleanup.

### `DomainReadSerializer` additions

| Field | Type | Visibility |
|---|---|---|
| `join_policy` | string enum | Always (public information) |
| `pending_join_requests_count` | integer or `null` | Integer for users who can approve (owner always; managers iff policy is `owner_managers`; superuser); `null` otherwise — no count leak |
| `my_join_request_status` | `"pending"` / `"approved"` / `"rejected"` / `null` | Computed for `request.user`; `null` for anonymous |

`my_join_request_status` returns the status of the most recent request the current user has on this domain (or `null` if none / not authenticated). This lets the frontend pick the right CTA without an extra request.

## Notifications

All emails go through the existing `core.mailers._common.send_user_plaintext_email`, which already wraps the rendering in `translation.override(user_language(user))`. New mailer module: `core/mailers/domain_join.py`.

| Trigger | Recipients | Mailer function |
|---|---|---|
| Pending request created | Owner; **plus** all managers iff `join_policy == "owner_managers"` | `send_join_request_created_email` |
| Request approved | The requester | `send_join_request_approved_email` |
| Request rejected | The requester (with `reject_reason` if non-empty) | `send_join_request_rejected_email` |
| Request cancelled by user | nobody | — |
| Pending request implicitly approved by admin push (`member_role`) | nobody | — |
| Bulk auto-approval after `join_policy` → `auto` | each affected requester (one email per request) | `send_join_request_approved_email` (reused) |

Subjects and bodies use Django i18n (`gettext` / `blocktrans`) in `.txt` templates under `core/templates/mailers/`. Each template receives the requester, the domain (so `safe_translation_getter("name", language_code=user_language(recipient), any_language=True)` can render the localized name), and the optional reason.

## Multilingual handling

| Element | Strategy |
|---|---|
| `JoinPolicy` enum codes | Machine codes in English. Frontend i18n. `gettext_lazy` labels are admin-only. |
| `Status` enum codes | Same. |
| Emails (subject + body) | Recipient's language via `translation.override(user_language(recipient))`, Django i18n in templates. Same pattern as existing mailers. |
| Domain name in emails / responses | `domain.safe_translation_getter("name", language_code=user_language(recipient), any_language=True)` |
| `reject_reason` | Plain free text in the manager's language. No translation in v1. |
| Manager UI hint | When the rejection dialog opens, show *"This user's preferred language is `<code>`. Consider writing your reason in that language."* |

If we later want to translate the rejection reason, the migration is small: add an optional `reject_reason_language` column and call DeepL on read or at email-render time. Out of scope for v1.

## Tests

Required test coverage in `quizonline-server/domain/tests/`:

### Model layer (`tests_models.py`)
- Partial unique constraint: cannot create two `pending` requests for same `(domain, user)`; can create a new pending after the previous one is rejected/cancelled.
- `Domain.join_policy` defaults to `"auto"`.

### View layer (new test class in `test_views.py`)
- **Create flow:**
  - `POST` on an `auto` domain: link added, no row created, 200.
  - `POST` on an `owner_validation` domain: pending row created, 201, email enqueued.
  - `POST` repeated on the same domain while pending: 200 idempotent, no duplicate row.
  - `POST` while already member: 409.
  - `POST` while domain owner: 400.
  - `POST` on inactive domain: 404.
- **Approve / reject flow:**
  - Owner approves on `owner_validation`: 200, user added to members, email enqueued.
  - Manager approves on `owner_validation`: 403.
  - Manager approves on `owner_managers`: 200.
  - Owner rejects with reason: 200, status updated, reason persisted, email enqueued.
  - Cancel by requester: 200, status updated, no email.
  - Cancel by another user: 403.
- **Admin push race:**
  - User has pending request, owner pushes via `member_role` → request becomes `approved` with `decided_by = owner`. No email.
- **Policy transition cleanup:**
  - Domain has 3 pending requests, owner switches `join_policy` to `auto` → all 3 become `approved`, 3 emails enqueued.
- **Permission to modify policy:**
  - Owner can change `join_policy`. Manager cannot (403). Superuser can.
- **Listing endpoints:**
  - `GET .../join-request/` returns only pending for that domain, scoped by approver permission.
  - `GET /api/user/me/join-requests/` returns only the current user's pending requests.
  - `pending_join_requests_count` is `null` for non-approvers, integer for approvers.

### Serializer layer (`tests_serializers.py`)
- Registration with mixed `auto` + `validation` domains: auto domains linked, validation domains create pending requests, response payload reflects both.
- Profile update with the same mix: same behavior; removed domains are removed.
- `DomainReadSerializer.my_join_request_status` returns the right value for each scenario (member / pending / rejected / none).

## Files touched (preview)

| File | Change |
|---|---|
| `quizonline-server/domain/models.py` | Add `JoinPolicy`, `Domain.join_policy`, `DomainJoinRequest` |
| `quizonline-server/domain/migrations/0005_*.py` (new) | Add column + new table + indexes + partial unique constraint |
| `quizonline-server/domain/serializers.py` | Add `DomainJoinRequestSerializer`, `DomainJoinRequestCreateSerializer`, `DomainJoinRequestRejectSerializer`; extend `DomainReadSerializer` and `DomainWriteSerializer` |
| `quizonline-server/domain/views.py` | Add `DomainJoinRequestViewSet` (nested under domain) and `MyJoinRequestsView`; modify `DomainViewSet.update` to handle policy transitions; modify `member_role` to flip pending → approved on admin push |
| `quizonline-server/domain/permissions.py` | Add `CanApproveJoinRequest` permission class |
| `quizonline-server/domain/urls.py` (or wherever the router is) | Register the new viewset(s) |
| `quizonline-server/customuser/serializers.py` | Update `CustomUserCreateSerializer.create` and `CustomUserProfileUpdateSerializer.update` to split auto/validation; add `pending_join_requests` to `CustomUserReadSerializer` |
| `quizonline-server/core/mailers/domain_join.py` (new) | 3 mailer functions |
| `quizonline-server/core/templates/mailers/join_request_*.txt` (new) | 3 templates with `{% trans %}` / `{% blocktrans %}` |
| `quizonline-server/domain/tests/test_views.py` | New test class covering the matrix above |
| `quizonline-server/domain/tests/tests_models.py` | Constraint + default tests |
| `quizonline-server/domain/tests/tests_serializers.py` | Mixed-payload registration / profile-update tests |

## Open questions / risks

- **Frontend work is out of this spec's scope** but will need to: regenerate the OpenAPI client, add Angular i18n strings for the new status codes, surface the pending-count badge, and add a small "Request to join" button on `available_for_linking`. Worth a follow-up frontend ticket once the backend is merged.
- **Email template skeleton**: I haven't yet read an existing mailer template to confirm the exact tag style (`{% trans %}` vs `{% blocktrans %}`). The implementation plan should start by reading one to align.
- **`linked_domains` set vs add semantics change**: this is a subtle behavior change that the frontend currently relies on for "remove a domain by dropping it from the list". The new logic preserves this exact behavior (it computes `to_remove` first), so there should be no observable regression. To be re-checked at PR review.
