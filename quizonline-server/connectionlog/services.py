from .geoip import lookup_geo
from .ip import trusted_client_ip
from .models import ConnectionEvent
from .useragent import parse_user_agent


def record_connection(*, user, request, client: dict) -> ConnectionEvent:
    """Create a ConnectionEvent from the authenticated user + request +
    browser-supplied ``client`` dict. Server-derived fields (account, ip,
    UA, geo) always win over anything in ``client``."""
    ua_string = request.META.get("HTTP_USER_AGENT", "")
    ip = trusted_client_ip(request)
    parsed = parse_user_agent(ua_string)
    geo = lookup_geo(ip or "")
    return ConnectionEvent.objects.create(
        user=user,
        account_email=getattr(user, "email", "") or "",
        login_method=client.get("login_method") or ConnectionEvent.PASSWORD,
        ip=ip,
        user_agent=ua_string,
        browser=parsed["browser"],
        os=parsed["os"],
        local_time=(client.get("local_time") or "")[:64],
        browser_language=(client.get("browser_language") or "")[:64],
        timezone=(client.get("timezone") or "")[:64],
        screen_width=client.get("screen_width"),
        screen_height=client.get("screen_height"),
        online=client.get("online"),
        **geo,
    )
