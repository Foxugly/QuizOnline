from django.urls import path

from .views import DomainBillingView

app_name = "billing-api"

urlpatterns = [
    path("domain/<int:domain_id>/billing/", DomainBillingView.as_view(), name="domain-billing"),
]
