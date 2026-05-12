"""
Shared infrastructure for the per-feature, per-language email copy
dictionaries shipped under ``core/mailers/``.

Before this module each mailer carried its own ad-hoc shape::

    def _<feature>_copy(language_code: str) -> dict[str, str]:
        if language_code == "fr": return {...}
        if language_code == "nl": return {...}
        ...
        return EN_DEFAULT

That ``if`` ladder repeated five times per feature, leaking a tiny
copy/paste delta whenever a new locale was added. This helper turns
the same data into a tidy ``{language_code: {key: value}}`` mapping
with a default fallback (``en``) honoured for unknown locales.
"""

from typing import Mapping


CopyDict = Mapping[str, str]


def pick_copy(
    *,
    catalog: Mapping[str, CopyDict],
    language_code: str | None,
    default_language: str = "en",
) -> CopyDict:
    """
    Return the dict of strings for ``language_code``, falling back to
    ``default_language`` for any unknown or missing locale. The result
    is read-only by convention — callers should not mutate it (each
    mailer call shares the same object reference).
    """
    if language_code and language_code in catalog:
        return catalog[language_code]
    return catalog[default_language]
