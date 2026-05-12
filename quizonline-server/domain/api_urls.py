from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DomainInviteAcceptView,
    DomainJoinRequestDecideView,
    DomainJoinRequestViewSet,
    DomainTransferAcceptView,
    DomainViewSet,
)

app_name = "domain-api"

router = DefaultRouter()
router.register(r"", DomainViewSet, basename="domain")

join_request_list = DomainJoinRequestViewSet.as_view({"get": "list", "post": "create"})
join_request_detail = DomainJoinRequestViewSet.as_view({"get": "retrieve"})
join_request_approve = DomainJoinRequestViewSet.as_view({"post": "approve"})
join_request_reject = DomainJoinRequestViewSet.as_view({"post": "reject"})
join_request_cancel = DomainJoinRequestViewSet.as_view({"post": "cancel"})
join_request_bulk_approve = DomainJoinRequestViewSet.as_view({"post": "bulk_approve"})
join_request_bulk_reject = DomainJoinRequestViewSet.as_view({"post": "bulk_reject"})

# Decode-from-mail endpoint MUST come before the router URLs: the router
# registers `<domain_id>/` with a permissive `[^/.]+` regex, which would
# happily swallow ``join-request`` as a domain id and 404 from there.
urlpatterns = [
    path(
        "join-request/decide/<str:token>/",
        DomainJoinRequestDecideView.as_view(),
        name="domain-join-request-decide",
    ),
    path(
        "invite/accept/<str:token>/",
        DomainInviteAcceptView.as_view(),
        name="domain-invite-accept",
    ),
    path(
        "transfer/accept/<str:token>/",
        DomainTransferAcceptView.as_view(),
        name="domain-transfer-accept",
    ),
] + router.urls + [
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
    path(
        "<int:domain_id>/join-request/bulk-approve/",
        join_request_bulk_approve,
        name="domain-join-request-bulk-approve",
    ),
    path(
        "<int:domain_id>/join-request/bulk-reject/",
        join_request_bulk_reject,
        name="domain-join-request-bulk-reject",
    ),
]
