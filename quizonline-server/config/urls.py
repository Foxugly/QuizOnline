# config/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAdminUser

from config.views_health import health_check
from customuser.auth import EmailConfirmedTokenObtainPairView
from customuser.throttling import TokenRefreshRateThrottle
from customuser.token_views import CookieTokenBlacklistView, CookieTokenRefreshView
from customuser.views import MagicLinkExchangeView, MagicLinkRequestView


def schema_permission_classes() -> list:
    """OpenAPI schema + Swagger UI: public in dev / CI, staff-only in prod
    (``API_SCHEMA_PUBLIC``, audit M10)."""
    return [AllowAny] if getattr(settings, "API_SCHEMA_PUBLIC", True) else [IsAdminUser]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check),

    # API module question
    path("api/v1/", include(("config.api_urls", "api"), namespace="api")),

    # OpenAPI/Swagger
    path(
        "api/v1/schema/",
        SpectacularAPIView.as_view(permission_classes=schema_permission_classes()),
        name="schema",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema", permission_classes=schema_permission_classes(),
        ),
    ),

    # Auth JWT
    path("api/v1/token/", EmailConfirmedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "api/v1/token/refresh/",
        CookieTokenRefreshView.as_view(throttle_classes=[TokenRefreshRateThrottle]),
        name="token_refresh",
    ),
    # Logout: revoke the refresh token (the access token dies in <= 15 min).
    path(
        "api/v1/token/blacklist/",
        CookieTokenBlacklistView.as_view(throttle_classes=[TokenRefreshRateThrottle]),
        name="token_blacklist",
    ),

    # Passwordless / magic-link sign-in.
    path("api/v1/auth/magic-link/request/", MagicLinkRequestView.as_view(), name="magic_link_request"),
    path("api/v1/auth/magic-link/exchange/", MagicLinkExchangeView.as_view(), name="magic_link_exchange"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path("schema-viewer/", include("schema_viewer.urls"))]
