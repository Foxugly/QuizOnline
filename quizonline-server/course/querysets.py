from django.db.models import Q
from parler.managers import TranslatableQuerySet

from config.permissions import is_authenticated_user, is_django_admin


class CourseQuerySet(TranslatableQuerySet):
    def published(self):
        return self.filter(is_published=True)

    def visible_to(self, user):
        """
        Visibility resolution for a course:

        - **Domain instructors** (owner / manager) always see every
          course in their domain, published or not.
        - **Domain members** see published courses in their domain
          UNLESS the course is in ``ENROLL_INVITE`` mode — those are
          hidden by default and only become visible to a member if
          they have a pending :class:`enrollment.CourseInvite`
          OR an existing :class:`enrollment.CourseEnrollment`
          (even a ``cancelled`` one, so they can see the history
          of a course they were once in).
        - **Anyone else** (anon, non-member of the domain) sees
          nothing.
        """
        from .models import Course
        if not is_authenticated_user(user):
            return self.none()
        if is_django_admin(user):
            return self.all()
        managed = Q(domain__owner=user) | Q(domain__managers=user)
        member = Q(domain__members=user) | managed

        # Public-side filter: an invite-only course is visible to a
        # member iff there is a pending invite for them OR they
        # already hold an enrollment row on the course.
        invite_visible = Q(enrollment_mode=Course.ENROLL_INVITE) & (
            Q(invites__invitee=user, invites__status="pending")
            | Q(enrollments__user=user)
        )
        not_invite_only = ~Q(enrollment_mode=Course.ENROLL_INVITE)
        member_visibility = (
            member & Q(is_published=True) & (not_invite_only | invite_visible)
        )

        return self.filter(managed | member_visibility).distinct()

    def content_readable_by(self, user):
        """``visible_to`` narrowed to the courses whose lesson content the
        caller may read. Seeing a course (catalog, outline) is not reading
        it: on an ``approval`` or ``invite`` course a learner needs an
        active or completed enrollment. ``open`` courses stay free to read,
        domain instructors and Django staff read everything. Mirrors
        :func:`course.permissions.can_read_course_content`."""
        from enrollment.models import CourseEnrollment
        from enrollment.services import PROGRESS_ENROLLMENT_STATUSES

        from .models import Course
        qs = self.visible_to(user)
        if not is_authenticated_user(user) or is_django_admin(user):
            return qs
        enrolled = CourseEnrollment.objects.filter(
            user=user, status__in=PROGRESS_ENROLLMENT_STATUSES,
        ).values("course_id")
        return qs.filter(
            Q(enrollment_mode=Course.ENROLL_OPEN)
            | Q(domain__owner=user)
            | Q(domain__managers=user)
            | Q(id__in=enrolled)
        ).distinct()


class SectionQuerySet(TranslatableQuerySet):
    def published(self):
        return self.filter(is_published=True)

    def visible_to(self, user):
        from .models import Course
        visible_courses = Course.objects.visible_to(user).values("id")
        qs = self.filter(course_id__in=visible_courses)
        if is_django_admin(user):
            return qs
        # Learners only see published sections (same rule as the course
        # detail tree); instructors of the domain keep their drafts.
        managed = Q(course__domain__owner=user) | Q(course__domain__managers=user)
        return qs.filter(managed | Q(is_published=True)).distinct()
