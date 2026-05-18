"""HTML sanitization for ContentBlock.rich_text — XSS-safe whitelist."""

import re

import nh3

ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "h2", "h3", "h4", "blockquote", "code", "pre", "img", "span", "sub", "sup",
}
# Tags that may carry inline ``style`` for colour / alignment — the
# values themselves are filtered by ``_filter_style_attr_value`` below
# so we never propagate ``url(...)`` payloads, ``expression(...)`` IE
# legacy, or anything else that could ferry an XSS payload through
# CSS. Quill emits ``span`` for ``color`` / ``background-color`` and
# ``p`` / headings for alignment, so those are the tags we open up.
_STYLED_TAGS = {"span", "p", "h2", "h3", "h4", "li", "blockquote"}
ALLOWED_ATTRS: dict[str, set[str]] = {
    # ``rel`` is intentionally omitted — ``link_rel`` below force-overwrites it
    # on every <a>. nh3/ammonia panics if both are set.
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title"},
}
for _tag in _STYLED_TAGS:
    ALLOWED_ATTRS.setdefault(_tag, set()).add("style")

# Whitelist of safe inline CSS properties Quill emits. Any property
# outside this list is dropped from the ``style`` attribute. Values are
# matched against a strict regex to keep the surface tight — no
# ``url(...)`` payloads, no ``expression(...)``, no ``\`` escapes.
_ALLOWED_CSS_PROPERTIES = frozenset({
    "color",
    "background-color",
    "text-align",
    "text-decoration",
    "font-weight",
    "font-style",
    "font-size",
})
# Whitelisted value shapes: hex, rgb()/rgba(), named keywords, percent,
# px / em / rem lengths, plus the few enum keywords text-align and
# text-decoration use. Intentionally rejects everything that contains
# a left paren that is not the rgb/rgba constructor.
_SAFE_CSS_VALUE_RE = re.compile(
    r"""^\s*(
        \#[0-9a-fA-F]{3,8}
      | rgba?\(\s*\d{1,3}(\s*,\s*\d{1,3}){2}(\s*,\s*(0|1|0?\.\d+))?\s*\)
      | [a-zA-Z]+
      | \d+(\.\d+)?(px|em|rem|%|pt)?
    )\s*$""",
    re.VERBOSE,
)


def _filter_style_attr_value(style: str) -> str:
    """Drop disallowed CSS properties from a ``style`` attribute value."""
    keep = []
    for decl in style.split(";"):
        if ":" not in decl:
            continue
        name, _, raw_value = decl.partition(":")
        prop = name.strip().lower()
        value = raw_value.strip()
        if prop not in _ALLOWED_CSS_PROPERTIES:
            continue
        if not _SAFE_CSS_VALUE_RE.match(value):
            continue
        keep.append(f"{prop}: {value}")
    return "; ".join(keep)


def _attribute_filter(tag: str, attribute: str, value: str) -> str | None:
    """nh3 attribute callback — strip unsafe ``style`` declarations."""
    if attribute == "style":
        filtered = _filter_style_attr_value(value)
        return filtered or None
    return value


def sanitize_rich_text(html: str) -> str:
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        attribute_filter=_attribute_filter,
        link_rel="noopener noreferrer",
        strip_comments=True,
    )
