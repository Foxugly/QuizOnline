from user_agents import parse as _parse


def parse_user_agent(ua_string: str) -> dict:
    """Approximate browser + OS from a User-Agent string. Best-effort:
    returns empty strings on a blank/unknown UA."""
    if not ua_string:
        return {"browser": "", "os": ""}
    ua = _parse(ua_string)
    browser = ua.browser.family or ""
    if ua.browser.version_string:
        browser = f"{browser} {ua.browser.version_string}".strip()
    os = ua.os.family or ""
    if ua.os.version_string:
        os = f"{os} {ua.os.version_string}".strip()
    return {"browser": browser[:120], "os": os[:120]}
