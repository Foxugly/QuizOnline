from rest_framework.routers import DefaultRouter

from customuser.notification_views import NotificationViewSet

app_name = "notification-api"

router = DefaultRouter()
router.register("", NotificationViewSet, basename="notification")

urlpatterns = router.urls
