from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CourseReview(models.Model):
    """A learner's review of a course. One per (user, course); the learner may
    edit their own. Whether it carries a star rating and/or a comment is gated
    by the course's domain config (``reviews_allow_rating`` /
    ``reviews_allow_comment``). Only learners who completed the course may post
    (enforced in the service). Owner/manager moderation hides a row via
    ``hidden_at`` rather than deleting it."""

    course = models.ForeignKey(
        "course.Course", on_delete=models.CASCADE, related_name="reviews",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_reviews",
    )
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Moderation: owner/manager hides an abusive review (kept, not deleted).
    hidden_at = models.DateTimeField(null=True, blank=True)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "user"], name="uniq_review_per_user_course",
            ),
        ]
        indexes = [models.Index(fields=["course", "hidden_at"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"CourseReview<course={self.course_id} user={self.user_id} rating={self.rating}>"

    @property
    def is_hidden(self) -> bool:
        return self.hidden_at is not None
