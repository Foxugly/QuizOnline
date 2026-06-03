import logging
from functools import lru_cache

from django.conf import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _reader():
    """Return a django.contrib.gis.geoip2.GeoIP2 reader, or None if the DB
    path is unset/unreadable. Cached so the .mmdb is memory-mapped once."""
    path = getattr(settings, "GEOIP_PATH", "") or ""
    if not path:
        return None
    try:
        from django.contrib.gis.geoip2 import GeoIP2
        return GeoIP2(path)
    except Exception as exc:  # missing file, bad DB, geoip2 not installed
        logger.warning("GeoIP2 unavailable (%s) — geolocation disabled", exc)
        return None


def lookup_geo(ip: str) -> dict:
    """Best-effort city-level geolocation for a public IP. Returns {} on any
    failure (no DB, private/invalid IP, lookup miss) — never raises."""
    reader = _reader()
    if not reader or not ip:
        return {}
    try:
        data = reader.city(ip)
    except Exception:
        return {}
    return {
        "country": (data.get("country_name") or "")[:120],
        "country_code": (data.get("country_code") or "")[:2],
        "city": (data.get("city") or "")[:180],
        "region": (data.get("region") or data.get("region_name") or "")[:180],
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
    }
