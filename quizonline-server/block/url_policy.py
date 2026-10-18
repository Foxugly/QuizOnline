"""Host allow-list for video and embed block URLs (audit M14).

Both land in an ``<iframe>`` on the learner's page, so they are limited
to HTTPS URLs on the providers the CSP ``frame-src`` (nginx) lets the
SPA frame: YouTube and Vimeo. ``LMS_EMBED_ALLOWED_HOSTS`` extends the
embed list — extend nginx's ``frame-src`` in the same change, or the
browser will still refuse the frame. Self-hosted (``upload``) videos are
played by a ``<video>`` element and are not restricted here.
"""
from __future__ import annotations

from urllib.parse import urlsplit

from django.conf import settings

YOUTUBE_HOSTS = frozenset({
    "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
    "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com",
})
VIMEO_HOSTS = frozenset({"vimeo.com", "www.vimeo.com", "player.vimeo.com"})

VIDEO_PROVIDER_HOSTS = {"youtube": YOUTUBE_HOSTS, "vimeo": VIMEO_HOSTS}


def embed_allowed_hosts() -> frozenset[str]:
    extra = getattr(settings, "LMS_EMBED_ALLOWED_HOSTS", None) or ()
    return YOUTUBE_HOSTS | VIMEO_HOSTS | {h.strip().lower() for h in extra if h.strip()}


def _https_host(url: str) -> str | None:
    """Lower-cased host of an ``https://`` URL, or ``None``."""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    if parts.scheme.lower() != "https" or not parts.hostname:
        return None
    return parts.hostname.lower()


def block_url_errors(*, video_provider: str, video_url: str, external_url: str) -> dict[str, str]:
    """Field -> message for every URL the policy refuses (empty = OK)."""
    errors: dict[str, str] = {}
    allowed_video_hosts = VIDEO_PROVIDER_HOSTS.get(video_provider or "")
    if video_url and allowed_video_hosts is not None:
        if _https_host(video_url) not in allowed_video_hosts:
            errors["video_url"] = (
                f"Use an https:// {video_provider} URL for a {video_provider} video."
            )
    if external_url and _https_host(external_url) not in embed_allowed_hosts():
        errors["external_url"] = "This site cannot be embedded (allowed: YouTube, Vimeo)."
    return errors
