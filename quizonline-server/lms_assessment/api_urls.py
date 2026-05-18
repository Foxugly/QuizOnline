from rest_framework.routers import DefaultRouter

from .views import LessonQuizViewSet

app_name = "lms_assessment-api"

router = DefaultRouter()
router.register(r"validation-quiz", LessonQuizViewSet, basename="validation-quiz")

urlpatterns = router.urls
