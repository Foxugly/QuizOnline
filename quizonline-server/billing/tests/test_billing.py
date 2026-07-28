from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from customuser.models import CustomUser
from domain.models import Domain
from billing.models import DomainBilling
from billing.services import get_or_create_billing, recompute_member_count
from billing.tasks import recompute_and_remind_billing


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(email="owner@ex.com", password="x")


@pytest.fixture
def domain(db, owner):
    return Domain.objects.create(owner=owner, active=True)


# ---- Pricing --------------------------------------------------------------

@pytest.mark.parametrize(
    "members,expected",
    [(0, 40), (1, 40), (100, 40), (101, 60), (200, 60), (201, 80), (350, 100)],
)
def test_monthly_price_tiers(members, expected):
    billing = DomainBilling(member_count=members)
    assert billing.monthly_price_eur_htva == expected


# ---- Deadline -------------------------------------------------------------

@pytest.mark.django_db
def test_is_past_deadline_only_for_free_with_elapsed_deadline(domain):
    now = timezone.now()
    b = get_or_create_billing(domain)

    # free + no deadline -> never past
    assert b.is_past_deadline(now=now) is False

    b.free_until = now - timedelta(days=1)
    assert b.is_past_deadline(now=now) is True  # free + elapsed

    b.free_until = now + timedelta(days=1)
    assert b.is_past_deadline(now=now) is False  # free + future

    # paid plan is never blocked, even past a stale deadline
    b.plan = DomainBilling.PLAN_PAID
    b.free_until = now - timedelta(days=10)
    assert b.is_past_deadline(now=now) is False


# ---- Member count ---------------------------------------------------------

@pytest.mark.django_db
def test_recompute_member_count(domain):
    b = get_or_create_billing(domain)
    for i in range(3):
        domain.members.add(CustomUser.objects.create_user(email=f"m{i}@ex.com", password="x"))
    assert recompute_member_count(b) == 3
    b.refresh_from_db()
    assert b.member_count == 3


# ---- Beat task ------------------------------------------------------------

@pytest.mark.django_db
@patch("billing.tasks.notify_billing_deadline")
def test_task_creates_billing_and_refreshes_counts(mock_notify, domain):
    domain.members.add(CustomUser.objects.create_user(email="m@ex.com", password="x"))
    result = recompute_and_remind_billing()
    assert result["domains"] == 1
    b = DomainBilling.objects.get(domain=domain)
    assert b.member_count == 1


@pytest.mark.django_db
@patch("billing.tasks.notify_billing_deadline")
def test_task_sends_14d_reminder_once(mock_notify, domain):
    b = get_or_create_billing(domain)
    b.free_until = timezone.now() + timedelta(days=10)  # (3, 14] band
    b.save(update_fields=["free_until"])

    assert recompute_and_remind_billing()["reminders"] == 1
    mock_notify.assert_called_once()
    b.refresh_from_db()
    assert b.reminder_14d_sent_at is not None
    assert b.reminder_3d_sent_at is None

    mock_notify.reset_mock()
    assert recompute_and_remind_billing()["reminders"] == 0  # idempotent
    mock_notify.assert_not_called()


@pytest.mark.django_db
@patch("billing.tasks.notify_billing_deadline")
def test_task_skips_paid_and_no_deadline(mock_notify, domain):
    b = get_or_create_billing(domain)
    # paid domain within what would be a reminder band -> skipped
    b.plan = DomainBilling.PLAN_PAID
    b.free_until = timezone.now() + timedelta(days=5)
    b.save(update_fields=["plan", "free_until"])

    other_owner = CustomUser.objects.create_user(email="o2@ex.com", password="x")
    other = Domain.objects.create(owner=other_owner, active=True)
    get_or_create_billing(other)  # free, no deadline -> skipped

    assert recompute_and_remind_billing()["reminders"] == 0
    mock_notify.assert_not_called()


# ---- Access block (get_visible_domains) -----------------------------------

def _visible_ids(user):
    return set(user.get_visible_domains(active_only=False).values_list("id", flat=True))


@pytest.mark.django_db
def test_blocked_domain_hidden_from_member_kept_for_owner_and_manager(domain, owner, settings):
    member = CustomUser.objects.create_user(email="mem@ex.com", password="x")
    domain.members.add(member)
    manager = CustomUser.objects.create_user(email="mgr@ex.com", password="x")
    domain.managers.add(manager)
    domain.members.add(manager)

    b = get_or_create_billing(domain)
    b.free_until = timezone.now() - timedelta(days=1)  # elapsed => blocked
    b.save(update_fields=["free_until"])

    settings.BILLING_ENFORCE_BLOCK = True
    assert domain.id not in _visible_ids(member)   # locked out
    assert domain.id in _visible_ids(owner)        # owner keeps access
    assert domain.id in _visible_ids(manager)      # manager keeps access


@pytest.mark.django_db
def test_block_can_be_disabled_by_setting(domain, settings):
    member = CustomUser.objects.create_user(email="mem2@ex.com", password="x")
    domain.members.add(member)
    b = get_or_create_billing(domain)
    b.free_until = timezone.now() - timedelta(days=1)
    b.save(update_fields=["free_until"])

    settings.BILLING_ENFORCE_BLOCK = False
    assert domain.id in _visible_ids(member)  # safety valve off => visible again


@pytest.mark.django_db
def test_free_without_deadline_is_not_blocked(domain, settings):
    member = CustomUser.objects.create_user(email="mem3@ex.com", password="x")
    domain.members.add(member)
    get_or_create_billing(domain)  # free, free_until=None

    settings.BILLING_ENFORCE_BLOCK = True
    assert domain.id in _visible_ids(member)


@pytest.mark.django_db
def test_future_deadline_is_not_blocked(domain, settings):
    member = CustomUser.objects.create_user(email="mem4@ex.com", password="x")
    domain.members.add(member)
    b = get_or_create_billing(domain)
    b.free_until = timezone.now() + timedelta(days=5)
    b.save(update_fields=["free_until"])

    settings.BILLING_ENFORCE_BLOCK = True
    assert domain.id in _visible_ids(member)


# ---- Endpoint -------------------------------------------------------------

@pytest.mark.django_db
def test_billing_endpoint_owner_ok_stranger_forbidden(domain, owner):
    url = f"/api/v1/domain/{domain.id}/billing/"

    client = APIClient()
    client.force_authenticate(owner)
    res = client.get(url)
    assert res.status_code == 200
    assert res.data["plan"] == "free"
    assert res.data["currency"] == "EUR"
    assert res.data["monthly_price_eur_htva"] == 40

    stranger = CustomUser.objects.create_user(email="nope@ex.com", password="x")
    client2 = APIClient()
    client2.force_authenticate(stranger)
    assert client2.get(url).status_code in (403, 404)
