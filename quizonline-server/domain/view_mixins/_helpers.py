"""Private helpers shared by multiple ``DomainViewSet`` mixins."""


def client_ip(request) -> str:
    """
    Best-effort client IP for audit logging. Honours ``X-Forwarded-For``
    (left-most hop) when the request transits the nginx reverse proxy in
    production; falls back to ``REMOTE_ADDR`` otherwise. Always returns a
    string (empty if neither is available) so structured logs stay typed.
    """
    if request is None:
        return ""
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR", "") or ""
