"""Per-app Playwright fullstack seed for the LMS course-invite flow.

Idempotent. Creates the deterministic course + pending invitation
the ``course-invite-fullstack.spec.ts`` Playwright spec drives:

* Course slug ``e2e-invite-only`` owned by ``admin`` in the
  "Sciences" domain, ``enroll_invite`` mode, published.
* A ``PENDING`` ``CourseInvite`` from admin to ``testuser``.
* Any prior ``CourseEnrollment`` from a previous accept-spec run is
  deleted so the spec lands on a clean slate every time.

Called by the meta-command :class:`question.management.commands.
seed_fullstack_e2e.Command` and reusable in isolation when only
LMS state needs refreshing on the test DB.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from core.seed_e2e import (
    ensure_e2e_admin,
    ensure_e2e_domain,
    ensure_e2e_languages,
    ensure_e2e_testuser,
    upsert_translation,
)
from language.models import Language
from lms_catalog.models import Course
from lms_enrollment.models import CourseEnrollment, CourseInvite


class Command(BaseCommand):
    help = "Seed LMS course-invite fixtures for Playwright full-stack tests."

    @transaction.atomic
    def handle(self, *args, **options):
        ensure_e2e_languages()
        admin = ensure_e2e_admin()
        testuser = ensure_e2e_testuser()
        domain = ensure_e2e_domain(admin, testuser)

        fr_lang = Language.objects.get(code="fr")
        invite_course = (
            Course.objects.filter(domain=domain, slug="e2e-invite-only").first()
        )
        if invite_course is None:
            invite_course = Course(
                domain=domain,
                slug="e2e-invite-only",
                language=fr_lang,
                level=Course.LEVEL_BEGINNER,
                enrollment_mode=Course.ENROLL_INVITE,
                is_published=True,
            )
            invite_course.set_current_language("fr")
            invite_course.title = "Cours sur invitation (E2E)"
            invite_course.description = "Cours seede pour le test Playwright d'acceptation d'invitation."
            invite_course.save()
        else:
            invite_course.enrollment_mode = Course.ENROLL_INVITE
            invite_course.is_published = True
            invite_course.save(update_fields=["enrollment_mode", "is_published"])
            upsert_translation(
                invite_course, "fr",
                title="Cours sur invitation (E2E)",
                description="Cours seede pour le test Playwright d'acceptation d'invitation.",
            )

        # Clear any enrollment from a previous accept-spec run so the
        # invite goes back to a clean PENDING state and the spec can
        # accept again.
        CourseEnrollment.objects.filter(course=invite_course, user=testuser).delete()

        invite, _created = CourseInvite.objects.get_or_create(
            course=invite_course,
            invitee=testuser,
            defaults={"created_by": admin, "status": CourseInvite.STATUS_PENDING},
        )
        if invite.status != CourseInvite.STATUS_PENDING:
            invite.status = CourseInvite.STATUS_PENDING
            invite.accepted_at = None
            invite.declined_at = None
            invite.revoked_at = None
            invite.save(
                update_fields=["status", "accepted_at", "declined_at", "revoked_at"],
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded LMS e2e: course_id={invite_course.id} invite_id={invite.id}",
            ),
        )
