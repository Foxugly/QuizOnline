from __future__ import annotations

from urllib.parse import parse_qs, urlparse


YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}


def is_youtube_url(url: str) -> bool:
    hostname = (urlparse(url).hostname or "").lower()
    return hostname in YOUTUBE_HOSTS


def extract_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url.strip())
    hostname = (parsed.hostname or "").lower()
    path_parts = [part for part in parsed.path.split("/") if part]

    if hostname in {"youtu.be", "www.youtu.be"}:
        candidate = path_parts[0] if path_parts else ""
        return candidate if _is_valid_video_id(candidate) else None

    if hostname in {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
    }:
        if path_parts[:1] == ["watch"]:
            candidate = parse_qs(parsed.query).get("v", [""])[0]
            return candidate if _is_valid_video_id(candidate) else None

        if path_parts[:1] in (["embed"], ["shorts"], ["live"], ["v"]):
            candidate = path_parts[1] if len(path_parts) > 1 else ""
            return candidate if _is_valid_video_id(candidate) else None

    return None


def normalize_external_url(url: str) -> str:
    normalized = url.strip()
    if not is_youtube_url(normalized):
        return normalized

    video_id = extract_youtube_video_id(normalized)
    if not video_id:
        raise ValueError("Unsupported YouTube URL.")
    return f"https://www.youtube.com/watch?v={video_id}"


def _is_valid_video_id(value: str) -> bool:
    if len(value) != 11:
        return False
    return all(char.isalnum() or char in {"-", "_"} for char in value)
