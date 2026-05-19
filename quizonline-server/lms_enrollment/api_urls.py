from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificateViewSet,
    CourseEnrollmentViewSet,
    CourseProgressViewSet,
    complete_lesson,
    course_analytics,
    course_invite_accept,
    course_invite_decline,
    course_invite_detail,
    course_invite_list,
    course_invite_resend,
    course_invite_revoke,
    course_invite_send,
    enroll_to_course,
    my_lesson_note,
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
    # Course-level invite endpoints (instructor side)
    path("course/<int:course_id>/invite/", course_invite_send, name="course-invite-send"),
    path("course/<int:course_id>/invites/", course_invite_list, name="course-invite-list"),
    path("course-invite/<int:pk>/resend/", course_invite_resend, name="course-invite-resend"),
    path("course-invite/<int:pk>/revoke/", course_invite_revoke, name="course-invite-revoke"),
    # Token-keyed invitee endpoints
    path("course-invite/<str:token>/", course_invite_detail, name="course-invite-detail"),
    path("course-invite/<str:token>/accept/", course_invite_accept, name="course-invite-accept"),
    path("course-invite/<str:token>/decline/", course_invite_decline, name="course-invite-decline"),
    path("lesson/<int:lesson_id>/start/", start_lesson, name="start-lesson"),
    path("lesson/<int:lesson_id>/complete/", complete_lesson, name="complete-lesson"),
    path("lesson/<int:lesson_id>/note/", my_lesson_note, name="lesson-note"),
    path("verify/<str:token>/", verify_certificate, name="verify"),
]
