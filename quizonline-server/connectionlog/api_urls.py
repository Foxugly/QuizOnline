from rest_framework.routers import DefaultRouter
from .views import ConnectionEventViewSet

router = DefaultRouter()
router.register(r"connection-log", ConnectionEventViewSet, basename="connection-log")
urlpatterns = router.urls
