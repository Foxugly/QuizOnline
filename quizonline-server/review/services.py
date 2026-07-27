from django.db.models import Avg, Count
from django.utils import timezone

from enrollment.models import CourseProgress

from .models import CourseReview


class ReviewNotAllowed(Exception):
    """The user is not eligible to review this course (not completed)."""


def user_has_completed_course(user, course) -> bool:
    """A learner may review a course only once they've completed it
    (CourseProgress at 100%). Mirrors certificate issuance eligibility."""
    cp = CourseProgress.objects.filter(user=user, course=course).first()
    return bool(cp and cp.progress_percent == 100)


def visible_reviews(course):
    """Non-hidden reviews for the course, newest first, author prefetched."""
    return (
        CourseReview.objects
        .filter(course=course, hidden_at__isnull=True)
        .select_related("user")
    )


def course_review_summary(course) -> dict:
    """Aggregate for cards / detail: average of the given star ratings, how many
    ratings, and the total visible reviews (some may be comment-only)."""
    agg = (
        CourseReview.objects
        .filter(course=course, hidden_at__isnull=True, rating__isnull=False)
        .aggregate(avg=Avg("rating"), count=Count("id"))
    )
    total = CourseReview.objects.filter(course=course, hidden_at__isnull=True).count()
    return {
        "average_rating": round(agg["avg"], 2) if agg["avg"] is not None else None,
        "rating_count": agg["count"] or 0,
        "review_count": total,
    }


def upsert_review(*, user, course, rating, comment):
    """Create or update the user's review of ``course``. Enforces completion and
    the domain's review config (a rating/comment the domain disallows is
    dropped). Raises :class:`ReviewNotAllowed` if the user hasn't completed it."""
    if not user_has_completed_course(user, course):
        raise ReviewNotAllowed()
    domain = course.domain
    clean_rating = rating if domain.reviews_allow_rating else None
    clean_comment = (comment or "") if domain.reviews_allow_comment else ""
    review, _ = CourseReview.objects.update_or_create(
        course=course, user=user,
        defaults={"rating": clean_rating, "comment": clean_comment},
    )
    return review


def set_review_hidden(*, review: CourseReview, hidden: bool, by_user) -> CourseReview:
    """Moderation toggle (owner/manager): hide/unhide a review without deleting."""
    review.hidden_at = timezone.now() if hidden else None
    review.hidden_by = by_user if hidden else None
    review.save(update_fields=["hidden_at", "hidden_by", "updated_at"])
    return review
