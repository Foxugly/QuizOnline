import logging
from requests import Response
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException, Timeout
from urllib3.util.retry import Retry

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class DeepLError(Exception):
    pass


def _build_session() -> requests.Session:
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"POST"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _deepl_base_url() -> str:
    is_free = getattr(settings, "DEEPL_IS_FREE", False)
    return "https://api-free.deepl.com" if is_free else "https://api.deepl.com"


def _raise_deepl_error(response: Response) -> None:
    if response.status_code == 403:
        raise DeepLError("DeepL authentication failed.")
    if response.status_code == 429:
        raise DeepLError("DeepL rate limit reached. Please retry later.")
    if response.status_code >= 500:
        raise DeepLError("DeepL service is temporarily unavailable.")
    raise DeepLError("DeepL translation request failed.")


def deepl_translate_many(texts: list[str], source: str, target: str, fmt: str = "text") -> list[str]:
    """
    Appelle DeepL pour traduire plusieurs textes en une requête.
    Retourne la liste traduite dans le même ordre.
    """
    logger.debug(
        "DeepL translate batch requested",
        extra={
            "source_lang": source,
            "target_lang": target,
            "format": fmt,
            "item_count": len(texts),
        },
    )
    if not settings.DEEPL_AUTH_KEY:
        raise DeepLError("DEEPL_AUTH_KEY is not configured")

    if not texts:
        return []

    url = f"{_deepl_base_url()}/v2/translate"

    # DeepL accepte text=... répété (form-encoded)
    data = [
        ("text", t) for t in texts
    ]
    data += [
        ("source_lang", source.upper()),
        ("target_lang", target.upper()),
    ]

    if fmt == "html":
        data.append(("tag_handling", "html"))
        # Optionnel : plus strict/qualitatif si supporté par ton plan
        # data.append(("tag_handling_version", "v2"))

    headers = {
        "Authorization": f"DeepL-Auth-Key {settings.DEEPL_AUTH_KEY}",
    }

    try:
        resp = _build_session().post(url, data=data, headers=headers, timeout=20)
    except Timeout as exc:
        logger.warning("deepl.timeout", extra={"source_lang": source, "target_lang": target})
        raise DeepLError("DeepL service timed out.") from exc
    except RequestException as exc:
        logger.warning("deepl.network_error", extra={"source_lang": source, "target_lang": target, "error": str(exc)})
        raise DeepLError("DeepL service is temporarily unavailable.") from exc

    if resp.status_code != 200:
        logger.warning(
            "deepl.request_failed",
            extra={"status_code": resp.status_code, "source_lang": source, "target_lang": target},
        )
        _raise_deepl_error(resp)

    payload = resp.json()
    translations = payload.get("translations") or []
    # On renvoie dans le même ordre
    out = [t.get("text", "") for t in translations]
    logger.debug(
        "DeepL translate batch completed",
        extra={
            "source_lang": source,
            "target_lang": target,
            "format": fmt,
            "item_count": len(texts),
            "translated_count": len(out),
        },
    )
    return out
