def trusted_client_ip(request) -> str | None:
    """Spoof-resistant client IP for the connection audit log.

    The edge proxy is a single nginx in front of the app. nginx is configured
    with ``proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`` (which
    APPENDS the real TCP peer as the LAST token) and ``X-Real-IP $remote_addr``.
    A client can freely forge the *left-most* X-Forwarded-For tokens, so we must
    NOT trust them — that is exactly how a user could otherwise fake the IP +
    geolocation of their own login event.

    Resolution order (most → least trustworthy for this single-nginx topology):
      1. ``X-Real-IP`` (nginx overwrites it with the real peer — unspoofable),
      2. the RIGHT-most ``X-Forwarded-For`` token (the peer nginx appended),
      3. ``REMOTE_ADDR``.
    Returns ``None`` when nothing is available.
    """
    real = (request.META.get("HTTP_X_REAL_IP") or "").strip()
    if real:
        return real
    xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    parts = [p.strip() for p in xff.split(",") if p.strip()]
    if parts:
        return parts[-1]
    return request.META.get("REMOTE_ADDR") or None
