from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DomainJoinRequestViewSet, DomainViewSet

app_name = "domain-api"

router = DefaultRouter()
router.register(r"", DomainViewSet, basename="domain")

join_request_list = DomainJoinRequestViewSet.as_view({"get": "list", "post": "create"})
join_request_detail = DomainJoinRequestViewSet.as_view({"get": "retrieve"})

urlpatterns = router.urls + [
    path(
        "<int:domain_id>/join-request/",
        join_request_list,
        name="domain-join-request-list",
    ),
    path(
        "<int:domain_id>/join-request/<int:req_id>/",
        join_request_detail,
        name="domain-join-request-detail",
    ),
]
