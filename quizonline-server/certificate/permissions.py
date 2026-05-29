from rest_framework.permissions import AllowAny


class CanVerifyCertificate(AllowAny):
    """Token IS the authorization. Throttled separately via AnonRateThrottle scope."""
    pass
