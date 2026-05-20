from rest_framework.routers import DefaultRouter

from .views import LessonViewSet

app_name = "lesson-api"

router = DefaultRouter()
router.register(r"lesson", LessonViewSet, basename="lesson")

urlpatterns = router.urls
