# config/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

from config.views_health import health_check
from customuser.auth import EmailConfirmedTokenObtainPairView
from customuser.views import MagicLinkExchangeView, MagicLinkRequestView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check),

    # API module question
    path("api/v1/", include(("config.api_urls", "api"), namespace="api")),

    # OpenAPI/Swagger
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema")),

    # Auth JWT
    path("api/v1/token/", EmailConfirmedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Passwordless / magic-link sign-in.
    path("api/v1/auth/magic-link/request/", MagicLinkRequestView.as_view(), name="magic_link_request"),
    path("api/v1/auth/magic-link/exchange/", MagicLinkExchangeView.as_view(), name="magic_link_exchange"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path("schema-viewer/", include("schema_viewer.urls"))]
