from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from course.models import Course

from .models import CourseReview
from .serializers import CourseReviewSerializer, CourseReviewWriteSerializer
from .services import (
    ReviewNotAllowed,
    course_review_summary,
    set_review_hidden,
    upsert_review,
    user_has_completed_course,
    visible_reviews,
)


def _is_owner_or_manager(user, domain) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if user.is_superuser:
        return True
    if domain.owner_id == user.id:
        return True
    return domain.managers.filter(id=user.id).exists()


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def course_reviews(request, course_id: int):
    course = get_object_or_404(Course.objects.select_related("domain"), pk=course_id)
    domain = course.domain
    can_moderate = _is_owner_or_manager(request.user, domain)

    if request.method == "GET":
        # Owner/manager see hidden reviews too (to moderate); others only visible.
        rows = (
            CourseReview.objects.filter(course=course).select_related("user")
            if can_moderate else visible_reviews(course)
        )
        my_review = CourseReview.objects.filter(course=course, user=request.user).first()
        ctx = {"request": request}
        return Response({
            "reviews": CourseReviewSerializer(rows, many=True, context=ctx).data,
            "summary": course_review_summary(course),
            "my_review": CourseReviewSerializer(my_review, context=ctx).data if my_review else None,
            "can_review": user_has_completed_course(request.user, course),
            "can_moderate": can_moderate,
            "config": {
                "allow_rating": domain.reviews_allow_rating,
                "allow_comment": domain.reviews_allow_comment,
            },
        })

    if request.method == "DELETE":
        CourseReview.objects.filter(course=course, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT — create/update the caller's own review.
    write = CourseReviewWriteSerializer(data=request.data)
    write.is_valid(raise_exception=True)
    try:
        review = upsert_review(
            user=request.user,
            course=course,
            rating=write.validated_data.get("rating"),
            comment=write.validated_data.get("comment", ""),
        )
    except ReviewNotAllowed:
        return Response(
            {"detail": "You can only review a course you have completed."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return Response(
        CourseReviewSerializer(review, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def moderate_review(request, review_id: int):
    """Owner/manager of the course's domain hides/unhides a review."""
    review = get_object_or_404(
        CourseReview.objects.select_related("course__domain"), pk=review_id,
    )
    if not _is_owner_or_manager(request.user, review.course.domain):
        return Response(status=status.HTTP_403_FORBIDDEN)
    hidden = bool(request.data.get("hidden", True))
    set_review_hidden(review=review, hidden=hidden, by_user=request.user)
    return Response(
        CourseReviewSerializer(review, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )
