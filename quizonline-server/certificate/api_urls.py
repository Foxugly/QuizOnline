from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CertificateViewSet, verify_certificate

app_name = "certificate-api"

router = DefaultRouter()
router.register(r"certificate", CertificateViewSet, basename="certificate")

urlpatterns = router.urls + [
    path("verify/<str:token>/", verify_certificate, name="verify"),
]
