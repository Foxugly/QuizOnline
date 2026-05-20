from rest_framework.routers import DefaultRouter

from .views import ContentBlockViewSet

app_name = "block-api"

router = DefaultRouter()
router.register(r"block", ContentBlockViewSet, basename="block")

urlpatterns = router.urls
