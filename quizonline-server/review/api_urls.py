from django.urls import path

from .views import course_reviews, moderate_review

app_name = "review-api"

urlpatterns = [
    path("course/<int:course_id>/reviews/", course_reviews, name="course-reviews"),
    path("review/<int:review_id>/moderate/", moderate_review, name="moderate-review"),
]
