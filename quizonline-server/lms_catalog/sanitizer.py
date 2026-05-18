"""HTML sanitization for ContentBlock.rich_text — XSS-safe whitelist."""

import nh3

ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "a", "ul", "ol", "li",
    "h2", "h3", "h4", "blockquote", "code", "pre", "img",
}
ALLOWED_ATTRS = {
    # ``rel`` is intentionally omitted — ``link_rel`` below force-overwrites it
    # on every <a>. nh3/ammonia panics if both are set.
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title"},
}


def sanitize_rich_text(html: str) -> str:
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        link_rel="noopener noreferrer",
        strip_comments=True,
    )
