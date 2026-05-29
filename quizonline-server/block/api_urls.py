from rest_framework.routers import DefaultRouter

from .views import BlockViewSet

app_name = "block-api"

router = DefaultRouter()
router.register(r"block", BlockViewSet, basename="block")

urlpatterns = router.urls
