from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DomainJoinRequestViewSet, DomainViewSet

app_name = "domain-api"

router = DefaultRouter()
router.register(r"", DomainViewSet, basename="domain")

join_request_create = DomainJoinRequestViewSet.as_view({"post": "create"})

urlpatterns = router.urls + [
    path(
        "<int:domain_id>/join-request/",
        join_request_create,
        name="domain-join-request-create",
    ),
]
