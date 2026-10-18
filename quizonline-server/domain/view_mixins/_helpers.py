"""Private helpers shared by multiple ``DomainViewSet`` mixins."""


def client_ip(request) -> str:
    """
    Best-effort client IP for audit logging. nginx is the only proxy and
    appends the peer it saw, so only the right-most ``X-Forwarded-For`` entry
    is trusted (the left-most ones are client-supplied and would let a caller
    forge the audited address); falls back to ``REMOTE_ADDR`` otherwise.
    Always returns a string (empty if neither is available) so structured
    logs stay typed.
    """
    if request is None:
        return ""
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[-1].strip()
    return forwarded or request.META.get("REMOTE_ADDR", "") or ""
