from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DomainJoinRequestViewSet, DomainViewSet

app_name = "domain-api"

router = DefaultRouter()
router.register(r"", DomainViewSet, basename="domain")

join_request_list = DomainJoinRequestViewSet.as_view({"get": "list", "post": "create"})
join_request_detail = DomainJoinRequestViewSet.as_view({"get": "retrieve"})
join_request_approve = DomainJoinRequestViewSet.as_view({"post": "approve"})
join_request_reject = DomainJoinRequestViewSet.as_view({"post": "reject"})
join_request_cancel = DomainJoinRequestViewSet.as_view({"post": "cancel"})

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
    path(
        "<int:domain_id>/join-request/<int:req_id>/approve/",
        join_request_approve,
        name="domain-join-request-approve",
    ),
    path(
        "<int:domain_id>/join-request/<int:req_id>/reject/",
        join_request_reject,
        name="domain-join-request-reject",
    ),
    path(
        "<int:domain_id>/join-request/<int:req_id>/cancel/",
        join_request_cancel,
        name="domain-join-request-cancel",
    ),
]
