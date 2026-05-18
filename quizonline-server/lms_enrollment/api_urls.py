from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificateViewSet,
    CourseEnrollmentViewSet,
    CourseProgressViewSet,
    complete_lesson,
    course_analytics,
    enroll_to_course,
    start_lesson,
    verify_certificate,
)

app_name = "lms_enrollment-api"

router = DefaultRouter()
router.register(r"enrollment", CourseEnrollmentViewSet, basename="enrollment")
router.register(r"progress", CourseProgressViewSet, basename="progress")
router.register(r"certificate", CertificateViewSet, basename="certificate")

urlpatterns = router.urls + [
    path("course/<int:course_id>/enroll/", enroll_to_course, name="enroll"),
    path("course/<int:course_id>/analytics/", course_analytics, name="course-analytics"),
    path("lesson/<int:lesson_id>/start/", start_lesson, name="start-lesson"),
    path("lesson/<int:lesson_id>/complete/", complete_lesson, name="complete-lesson"),
    path("verify/<str:token>/", verify_certificate, name="verify"),
]
