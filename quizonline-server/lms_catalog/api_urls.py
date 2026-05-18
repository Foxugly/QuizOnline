from rest_framework.routers import DefaultRouter

from .views import ContentBlockViewSet, CourseViewSet, LessonViewSet, SectionViewSet

app_name = "lms_catalog-api"

router = DefaultRouter()
router.register(r"course", CourseViewSet, basename="course")
router.register(r"section", SectionViewSet, basename="section")
router.register(r"lesson", LessonViewSet, basename="lesson")
router.register(r"block", ContentBlockViewSet, basename="block")

urlpatterns = router.urls
