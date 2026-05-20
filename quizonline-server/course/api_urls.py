from rest_framework.routers import DefaultRouter

from .views import CourseViewSet, SectionViewSet

app_name = "course-api"

router = DefaultRouter()
router.register(r"course", CourseViewSet, basename="course")
router.register(r"section", SectionViewSet, basename="section")

urlpatterns = router.urls
